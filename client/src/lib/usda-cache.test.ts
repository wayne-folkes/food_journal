import { buildLookupCacheRows, dedupeCacheRows, dropFailedLegacyRefreshes, dropFailedLookups, isCacheHit, NOT_FOUND_TTL_MS, type LookupCacheRow } from '../../../api/usda-cache'

const NOW = new Date('2026-11-12T00:00:00.000Z')

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
      }],
      NOW
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
        serving_g: null,
        created_at: '2026-11-12T00:00:00.000Z',
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
      }],
      NOW
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
        serving_g: null,
        created_at: '2026-11-12T00:00:00.000Z',
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
    created_at: NOW.toISOString(),
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

describe('not_found TTL and failed lookups', () => {
  const now = NOW.getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()
  const day = 24 * 60 * 60 * 1000

  it('keeps fresh not_found rows as hits and expires ones older than the TTL', () => {
    expect(isCacheHit({ source: 'not_found', protein_per_100g: null, created_at: ago(day) }, now)).toBe(true)
    expect(isCacheHit({ source: 'not_found', protein_per_100g: null, created_at: ago(NOT_FOUND_TTL_MS) }, now)).toBe(true)
    expect(isCacheHit({ source: 'not_found', protein_per_100g: null, created_at: ago(NOT_FOUND_TTL_MS + 1000) }, now)).toBe(false)
    expect(NOT_FOUND_TTL_MS).toBe(7 * day)
  })

  it('treats a missing or invalid created_at on not_found as fresh', () => {
    expect(isCacheHit({ source: 'not_found', protein_per_100g: null, created_at: null }, now)).toBe(true)
    expect(isCacheHit({ source: 'not_found', protein_per_100g: null, created_at: 'garbage' }, now)).toBe(true)
  })

  it('never expires complete usda rows by age', () => {
    expect(isCacheHit({ source: 'usda', protein_per_100g: 1, created_at: ago(365 * day) }, now)).toBe(true)
    expect(isCacheHit({ source: 'usda', protein_per_100g: null, created_at: ago(day) }, now)).toBe(false)
  })

  it('drops rows for failed lookups but keeps genuine not_found and usda rows', () => {
    const mk = (key: string, source: 'usda' | 'not_found'): LookupCacheRow => ({
      description_key: key, description: key,
      calories_per_100g: null, protein_per_100g: null, fiber_per_100g: null,
      source, usda_fdc_id: null, created_at: NOW.toISOString(),
    })
    const rows = [mk('flaky', 'not_found'), mk('mystery', 'not_found'), mk('apple', 'usda')]
    expect(dropFailedLookups(rows, new Set(['flaky'])).map((r) => r.description_key)).toEqual(['mystery', 'apple'])
  })

  it('stores per-100g values and the serving weight, not the scaled result', () => {
    const rows = buildLookupCacheRows(
      [{ id: 'item-1', description: 'almonds' }],
      [{
        result: { id: 'item-1', description: 'almonds', calories: 162, protein_g: 5.9, fiber_g: 3.5, source: 'usda' },
        fdcId: 1,
        per100g: { calories: 579, protein_g: 21.2, fiber_g: 12.5 },
        servingG: 28,
      }],
      NOW
    )

    expect(rows[0]).toMatchObject({ calories_per_100g: 579, protein_per_100g: 21.2, fiber_per_100g: 12.5, serving_g: 28 })
  })
})
