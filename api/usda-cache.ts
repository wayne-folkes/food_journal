export interface LookupItem {
  id: string
  description: string
}

export interface LookupResult {
  id: string
  description: string
  calories: number | null
  source: 'cache' | 'usda' | 'not_found'
}

export interface LookupCacheRow {
  description_key: string
  description: string
  calories_per_100g: number | null
  source: 'usda' | 'not_found'
  usda_fdc_id: number | null
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
      source: result.source === 'usda' ? 'usda' : 'not_found',
      usda_fdc_id: fdcId,
    }
  })
}
