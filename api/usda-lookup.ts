import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import type { LookupItem, LookupResult } from '../shared/usda-lookup'
import { errorMessage } from '../shared/logger'
import { buildLookupCacheRows, dedupeCacheRows, dropFailedLegacyRefreshes, isCacheHit } from './usda-cache'
import { aiEstimateEnabled, estimateCaloriesWithAi } from './ai-estimate'
import { extractUsdaNutrients, type UsdaFoodNutrient } from './usda-nutrients'
import { log as rootLog } from './logger'

async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  let i = 0
  async function run(): Promise<void> {
    while (i < tasks.length) {
      const idx = i++
      results[idx] = await tasks[idx]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run))
  return results
}

const USDA_API_KEY = process.env.USDA_API_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client — bypasses RLS for cache writes
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Anon client — for verifying user JWT
const supabaseAnon = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

interface CachedLookupRow {
  description_key: string
  calories_per_100g: number | null
  protein_per_100g: number | null
  fiber_per_100g: number | null
  source: 'usda' | 'not_found'
}

async function fetchFromUsda(
  description: string
): Promise<{ calories: number | null; protein_g: number | null; fiber_g: number | null; fdcId: number | null }> {
  const response = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': USDA_API_KEY },
    body: JSON.stringify({
      query: description,
      dataType: ['Foundation', 'SR Legacy'],
      pageSize: 25,
      sortBy: 'score',
      sortOrder: 'desc'
    })
  })

  const data = await response.json() as {
    foods?: Array<{
      fdcId: number
      description: string
      dataType?: string
      foodNutrients?: UsdaFoodNutrient[]
    }>
  }

  const foods = data.foods ?? []
  const queryLower = description.toLowerCase().trim()

  // Score each candidate — higher is better:
  // +30  Foundation dataset (whole, minimally processed foods)
  // +20  description starts with query or its plural (e.g. "oranges" for "orange")
  // +10  query is the first comma-separated word of description
  //  -1 per char  shorter descriptions preferred (more generic)
  function scoreFood(f: typeof foods[0]): number {
    let score = 0
    const desc = f.description.toLowerCase()
    const firstSegment = desc.split(',')[0].trim()

    if (f.dataType === 'Foundation') score += 30
    if (desc.startsWith(queryLower) || desc.startsWith(queryLower + 's')) score += 20
    if (firstSegment === queryLower || firstSegment === queryLower + 's') score += 10
    score -= f.description.length * 0.1   // shorter = more generic

    return score
  }

  const food = foods.length > 0
    ? [...foods].sort((a, b) => scoreFood(b) - scoreFood(a))[0]
    : undefined

  const { calories, protein_g, fiber_g } = extractUsdaNutrients(food?.foodNutrients)

  return { calories, protein_g, fiber_g, fdcId: food?.fdcId ?? null }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Auth check
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const log = rootLog.child()
    log.withContext({ handler: 'usda-lookup', userId: user.id })

    // 2. Per-user rate limit check (60 req/hr)
    const { data: overLimit, error: rlError } = await supabaseAdmin
      .rpc('check_and_increment_api_rate_limit', {
        p_user_id: user.id,
        p_limit: 60   // 60 requests per hour per user
      })

    if (rlError) {
      log.withMetadata({ error: errorMessage(rlError) }).warn('rate limit check failed')
      // Fail open — don't block the request if the rate limit table has an issue
    } else if (overLimit) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again next hour.' })
    }

    // 3. Parse body: { items: LookupItem[] }
    const body = req.body as { items?: LookupItem[] }
    const items = body?.items

    // 4. Validate items array (max 20 items)
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' })
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'items array must not exceed 20 entries' })
    }
    if (items.some(i => typeof i.description !== 'string' || i.description.length === 0 || i.description.length > 200)) {
      return res.status(400).json({ error: 'each item description must be 1–200 characters' })
    }

    // 5. Batch cache lookup
    const keys = items.map(i => i.description.toLowerCase().trim())
    const { data: cached } = await supabaseAdmin
      .from('food_lookup')
      .select('description_key, calories_per_100g, protein_per_100g, fiber_per_100g, source')
      .in('description_key', keys)

    const cacheMap = new Map(
      ((cached ?? []) as CachedLookupRow[]).map((row) => [row.description_key, row] as const)
    )

    // Separate hits from misses
    const hits: LookupResult[] = []
    const misses: LookupItem[] = []
    // Stale pre-macro USDA rows being refreshed; a failed refresh must never downgrade them
    const legacyRows = new Map<string, CachedLookupRow>()

    for (const item of items) {
      const key = item.description.toLowerCase().trim()
      const row = cacheMap.get(key)
      if (row && isCacheHit(row)) {
        hits.push({
          id: item.id,
          description: item.description,
          calories: row.calories_per_100g ?? null,
          protein_g: row.protein_per_100g ?? null,
          fiber_g: row.fiber_per_100g ?? null,
          source: 'cache'
        })
      } else {
        misses.push(item)
        if (row) legacyRows.set(key, row)
      }
    }

    // 6. USDA calls for misses (concurrency-limited to 5)
    const missResults = await pLimit(
      misses.map((item) => async (): Promise<{ result: LookupResult; fdcId: number | null }> => {
        try {
          const { calories, protein_g, fiber_g, fdcId } = await fetchFromUsda(item.description)
          return {
            result: {
              id: item.id,
              description: item.description,
              calories,
              protein_g,
              fiber_g,
              source: calories !== null ? 'usda' : 'not_found'
            },
            fdcId
          }
        } catch (err) {
          log.withMetadata({ description: item.description, error: errorMessage(err) }).error('USDA lookup failed')
          return {
            result: {
              id: item.id,
              description: item.description,
              calories: null,
              protein_g: null,
              fiber_g: null,
              source: 'not_found'
            },
            fdcId: null
          }
        }
      }),
      5
    )

    // 7. Cache write for new results (upsert all misses, including not_found)
    const upsertRows = dedupeCacheRows(
      dropFailedLegacyRefreshes(buildLookupCacheRows(misses, missResults), new Set(legacyRows.keys()))
    )

    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('food_lookup')
        .upsert(upsertRows, { onConflict: 'description_key' })

      if (upsertError) {
        log.withMetadata({ error: errorMessage(upsertError) }).warn('cache upsert failed')
      }
    }

    // A failed refresh of a legacy row (USDA error / no energy value) falls back to
    // what the cache already had, instead of dropping to not_found or the AI guess.
    misses.forEach((item, index) => {
      const row = legacyRows.get(item.description.toLowerCase().trim())
      if (row && missResults[index].result.source !== 'usda') {
        missResults[index].result = {
          ...missResults[index].result,
          calories: row.calories_per_100g ?? null,
          protein_g: null,
          fiber_g: null,
          source: 'cache'
        }
      }
    })

    // 8. Return { results: LookupResult[] } preserving original order
    const hitResultMap = new Map(hits.map((result) => [result.id, result]))
    const missResultMap = new Map(missResults.map(({ result }) => [result.id, result]))
    const results: LookupResult[] = []

    for (const item of items) {
      const result = hitResultMap.get(item.id) ?? missResultMap.get(item.id)

      if (!result) {
        log.withMetadata({ itemId: item.id }).error('missing assembled result')
        return res.status(500).json({ error: 'Failed to assemble lookup results' })
      }

      results.push(result)
    }

    // 9. AI fallback for anything still without calories (cache-null or USDA miss).
    // Not written to food_lookup: model guesses must not pollute the USDA cache.
    const unresolved = results.filter((r) => r.calories === null)
    if (unresolved.length > 0 && aiEstimateEnabled()) {
      try {
        const estimates = await estimateCaloriesWithAi(unresolved)
        for (const r of unresolved) {
          const estimate = estimates.get(r.id)
          if (estimate !== undefined) {
            r.calories = estimate.calories
            r.protein_g = estimate.protein_g
            r.fiber_g = estimate.fiber_g
            r.source = 'ai'
          }
        }
      } catch (err) {
        // Best-effort: USDA results are still returned
        log.withMetadata({ error: errorMessage(err) }).warn('AI calorie estimate failed')
      }
    }

    return res.status(200).json({ results })
  } catch (err) {
    rootLog.withMetadata({ handler: 'usda-lookup', error: errorMessage(err) }).error('usda-lookup unexpected error')
    return res.status(500).json({ error: 'Internal server error' })
  }
}
