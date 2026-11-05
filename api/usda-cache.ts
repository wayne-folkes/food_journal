import type { LookupItem, LookupResult } from '../shared/usda-lookup'

export interface LookupCacheRow {
  description_key: string
  description: string
  calories_per_100g: number | null
  protein_per_100g: number | null
  fiber_per_100g: number | null
  source: 'usda' | 'not_found'
  usda_fdc_id: number | null
}

/**
 * Legacy USDA rows were cached before protein/fiber existed, so they have null
 * protein. Treat them as misses so the refetch upserts them with macros.
 * not_found rows stay hits.
 */
export function isCacheHit(row: { source: string; protein_per_100g: number | null }): boolean {
  return row.source !== 'usda' || row.protein_per_100g !== null
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
  missResults: Array<{ result: LookupResult; fdcId: number | null }>
): LookupCacheRow[] {
  return misses.map((item, index) => {
    const { result, fdcId } = missResults[index]
    return {
      description_key: item.description.toLowerCase().trim(),
      description: item.description,
      calories_per_100g: result.calories,
      protein_per_100g: result.protein_g,
      fiber_per_100g: result.fiber_g,
      source: result.source === 'usda' ? 'usda' : 'not_found',
      usda_fdc_id: fdcId,
    }
  })
}
