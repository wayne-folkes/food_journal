import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

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

interface LookupItem {
  id: string         // meal_item id
  description: string
}

interface LookupResult {
  id: string
  description: string
  calories: number | null   // kcal per 100g, or null if not found
  source: 'cache' | 'usda' | 'not_found'
}

async function fetchFromUsda(description: string): Promise<{ calories: number | null; fdcId: number | null }> {
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: description,
      dataType: ['Foundation', 'SR Legacy'],
      pageSize: 1,
      sortBy: 'score',
      sortOrder: 'desc'
    })
  })

  const data = await response.json() as { foods?: Array<{ fdcId: number; foodNutrients?: Array<{ number: string; amount: number }> }> }
  const food = data.foods?.[0]

  // Find energy nutrient (number 208 = Energy, kcal)
  const energyNutrient = food?.foodNutrients?.find(
    (n: { number: string }) => String(n.number) === '208'
  )
  const calories = energyNutrient ? Math.round(energyNutrient.amount) : null

  return { calories, fdcId: food?.fdcId ?? null }
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

    // 2. Parse body: { items: LookupItem[] }
    const body = req.body as { items?: LookupItem[] }
    const items = body?.items

    // 3. Validate items array (max 20 items)
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' })
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'items array must not exceed 20 entries' })
    }

    // 4. Batch cache lookup
    const keys = items.map(i => i.description.toLowerCase().trim())
    const { data: cached } = await supabaseAdmin
      .from('food_lookup')
      .select('description_key, calories_per_100g')
      .in('description_key', keys)

    const cacheMap = new Map(cached?.map(r => [r.description_key, r.calories_per_100g]) ?? [])

    // Separate hits from misses
    const hits: LookupResult[] = []
    const misses: LookupItem[] = []

    for (const item of items) {
      const key = item.description.toLowerCase().trim()
      if (cacheMap.has(key)) {
        hits.push({
          id: item.id,
          description: item.description,
          calories: cacheMap.get(key) ?? null,
          source: 'cache'
        })
      } else {
        misses.push(item)
      }
    }

    // 5. USDA calls for misses (concurrent with Promise.all)
    const missResults = await Promise.all(
      misses.map(async (item): Promise<{ result: LookupResult; fdcId: number | null }> => {
        try {
          const { calories, fdcId } = await fetchFromUsda(item.description)
          return {
            result: {
              id: item.id,
              description: item.description,
              calories,
              source: calories !== null ? 'usda' : 'not_found'
            },
            fdcId
          }
        } catch (err) {
          console.error(`USDA lookup failed for "${item.description}":`, err)
          return {
            result: {
              id: item.id,
              description: item.description,
              calories: null,
              source: 'not_found'
            },
            fdcId: null
          }
        }
      })
    )

    // 6. Cache write for new results (upsert all misses, including not_found)
    const upsertRows = misses.map((item, i) => {
      const { result, fdcId } = missResults[i]
      return {
        description_key: item.description.toLowerCase().trim(),
        description: item.description,
        calories_per_100g: result.calories,
        source: 'usda',
        usda_fdc_id: fdcId
      }
    })

    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('food_lookup')
        .upsert(upsertRows, { onConflict: 'description_key' })

      if (upsertError) {
        console.error('Cache upsert error:', upsertError)
      }
    }

    // 7. Return { results: LookupResult[] } preserving original order
    const missResultMap = new Map(missResults.map(({ result }) => [result.id, result]))
    const results: LookupResult[] = items.map(item => {
      const hit = hits.find(h => h.id === item.id)
      return hit ?? missResultMap.get(item.id)!
    })

    return res.status(200).json({ results })
  } catch (err) {
    console.error('usda-lookup unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
