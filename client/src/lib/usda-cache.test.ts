import { buildLookupCacheRows, dedupeCacheRows, dropFailedLegacyRefreshes, isCacheHit, type LookupCacheRow } from '../../../api/usda-cache'

describe('buildLookupCacheRows', () => {
  it('preserves not_found source when caching USDA misses', () => {
    const rows = buildLookupCacheRows(
      [{ id: 'item-1', description: 'mystery food' }],
      [{
        result: {
          id: 'item-1',
          description: 'mystery food',
          calories: null,
          protein_g: null,
          fiber_g: null,
          source: 'not_found',
        },
        fdcId: null,
      }]
    )

    expect(rows).toEqual([
      {
        description_key: 'mystery food',
        description: 'mystery food',
        calories_per_100g: null,
        protein_per_100g: null,
        fiber_per_100g: null,
        source: 'not_found',
        usda_fdc_id: null,
      },
    ])
  })

  it('caches USDA calories, protein and fiber per 100g', () => {
    const rows = buildLookupCacheRows(
      [{ id: 'item-1', description: '  Chickpeas ' }],
      [{
        result: {
          id: 'item-1',
          description: '  Chickpeas ',
          calories: 364,
          protein_g: 19.3,
          fiber_g: 17.4,
          source: 'usda',
        },
        fdcId: 170392,
      }]
    )

    expect(rows).toEqual([
      {
        description_key: 'chickpeas',
        description: '  Chickpeas ',
        calories_per_100g: 364,
        protein_per_100g: 19.3,
        fiber_per_100g: 17.4,
        source: 'usda',
        usda_fdc_id: 170392,
      },
    ])
  })
})

describe('legacy cache refresh safety', () => {
  const row = (key: string, source: 'usda' | 'not_found'): LookupCacheRow => ({
    description_key: key,
    description: key,
    calories_per_100g: source === 'usda' ? 89 : null,
    protein_per_100g: source === 'usda' ? 1.1 : null,
    fiber_per_100g: source === 'usda' ? 2.6 : null,
    source,
    usda_fdc_id: null,
  })

  it('treats usda rows without protein as misses; not_found and complete rows stay hits', () => {
    expect(isCacheHit({ source: 'usda', protein_per_100g: null })).toBe(false)
    expect(isCacheHit({ source: 'usda', protein_per_100g: 0 })).toBe(true)
    expect(isCacheHit({ source: 'not_found', protein_per_100g: null })).toBe(true)
  })

  it('does not let a failed refresh overwrite a legacy row, but lets a successful one through', () => {
    const rows = [row('banana', 'not_found'), row('apple', 'usda'), row('kiwi', 'not_found')]
    const kept = dropFailedLegacyRefreshes(rows, new Set(['banana', 'apple']))
    expect(kept.map((r) => r.description_key)).toEqual(['apple', 'kiwi'])
  })

  it('keeps one row per description_key so a repeated description cannot fail the upsert', () => {
    const rows = [row('apple', 'usda'), row('apple', 'usda'), row('kiwi', 'not_found')]
    expect(dedupeCacheRows(rows).map((r) => r.description_key)).toEqual(['apple', 'kiwi'])
  })
})
