import type { LookupItem, LookupResult } from '../shared/usda-lookup'
import type { Per100g } from './usda-serving'

export interface LookupCacheRow {
  description_key: string
  description: string
  calories_per_100g: number | null
  protein_per_100g: number | null
  fiber_per_100g: number | null
  source: 'usda' | 'not_found'
  usda_fdc_id: number | null
  /** Typical serving weight in grams (null: USDA had no portions); the values above stay per 100 g. */
  serving_g: number | null
  /** ISO timestamp; sent on every upsert so a refreshed row restarts its TTL. */
  created_at: string
}

/** not_found rows expire so a food USDA later learns about is looked up again. */
export const NOT_FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Legacy USDA rows were cached before protein/fiber existed, so they have null
 * protein. Treat them as misses so the refetch upserts them with macros.
 * not_found rows stay hits until they are older than NOT_FOUND_TTL_MS (a missing
 * or unparseable created_at counts as fresh).
 */
export function isCacheHit(
  row: { source: string; protein_per_100g: number | null; created_at?: string | null },
  now: number = Date.now()
): boolean {
  if (row.source === 'usda') return row.protein_per_100g !== null
  const createdAt = row.created_at ? Date.parse(row.created_at) : NaN
  return Number.isNaN(createdAt) || now - createdAt <= NOT_FOUND_TTL_MS
}

/**
 * Only definitive answers may be cached. A lookup that failed (USDA 429/5xx,
 * timeout, network error) says nothing about the food, so its row is dropped
 * and the next request tries USDA again.
 */
export function dropFailedLookups(
  rows: LookupCacheRow[],
  failedKeys: ReadonlySet<string>
): LookupCacheRow[] {
  return rows.filter((row) => !failedKeys.has(row.description_key))
}

/**
 * A refetch of a legacy USDA row can fail (USDA error/timeout) or come back
 * empty. Upserting that as `not_found` would replace a good cached value, so
 * only successful refreshes may overwrite a legacy row.
 */
export function dropFailedLegacyRefreshes(
  rows: LookupCacheRow[],
  legacyKeys: ReadonlySet<string>
): LookupCacheRow[] {
  return rows.filter((row) => !legacyKeys.has(row.description_key) || row.source === 'usda')
}

/** One row per description_key — Postgres rejects an upsert that touches the same key twice. */
export function dedupeCacheRows(rows: LookupCacheRow[]): LookupCacheRow[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.description_key)) return false
    seen.add(row.description_key)
    return true
  })
}

export function buildLookupCacheRows(
  misses: LookupItem[],
  missResults: Array<{
    result: LookupResult
    fdcId: number | null
    /** Values as USDA reports them; `result` holds the (scaled) per-serving values, which must never be cached. */
    per100g: Per100g
    servingG?: number | null
  }>,
  now: Date = new Date()
): LookupCacheRow[] {
  return misses.map((item, index) => {
    const { result, fdcId, servingG, per100g } = missResults[index]
    return {
      description_key: item.description.toLowerCase().trim(),
      description: item.description,
      calories_per_100g: per100g.calories,
      protein_per_100g: per100g.protein_g,
      fiber_per_100g: per100g.fiber_g,
      source: result.source === 'usda' ? 'usda' : 'not_found',
      usda_fdc_id: fdcId,
      serving_g: servingG ?? null,
      created_at: now.toISOString(),
    }
  })
}

/**
 * True when a Supabase/PostgREST error means a column does not exist (migration
 * 0019 not applied): PGRST204 (schema cache: column not found) or Postgres 42703
 * (undefined column). Any other error must not trigger the serving_g fallback.
 */
export function isUnknownColumnError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === 'PGRST204' || error?.code === '42703'
}
