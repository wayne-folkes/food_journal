import { buildLookupCacheRows } from '../../../api/usda-cache'

describe('buildLookupCacheRows', () => {
  it('preserves not_found source when caching USDA misses', () => {
    const rows = buildLookupCacheRows(
      [{ id: 'item-1', description: 'mystery food' }],
      [{
        result: {
          id: 'item-1',
          description: 'mystery food',
          calories: null,
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
        source: 'not_found',
        usda_fdc_id: null,
      },
    ])
  })
})
