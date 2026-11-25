import { describe, it, expect } from 'vitest'
import type { LookupResult } from '@shared/usda-lookup'
import { formatAmount, formatGrams, itemNeedsEstimate, nutrientPatch, percentDailyValue, sumNutrients } from './nutrients'
import { NUTRIENTS } from '@shared/nutrients'

function result(partial: Partial<LookupResult> = {}): LookupResult {
  return { id: 'x', description: 'x', calories: null, protein_g: null, fiber_g: null, nutrients: null, source: 'usda', ...partial }
}

describe('itemNeedsEstimate', () => {
  it('is false when all three values are present (including 0) and nutrients were estimated', () => {
    expect(itemNeedsEstimate({ calories: 0, protein_g: 0, fiber_g: 0, nutrients: {} })).toBe(false)
  })
  it('is true when the item was never estimated for the other nutrients', () => {
    expect(itemNeedsEstimate({ calories: 1, protein_g: 1, fiber_g: 1, nutrients: null })).toBe(true)
    expect(itemNeedsEstimate({ calories: 1, protein_g: 1, fiber_g: 1 })).toBe(true)
  })
  it('is true when any value is null', () => {
    expect(itemNeedsEstimate({ calories: null, protein_g: 1, fiber_g: 1 })).toBe(true)
    expect(itemNeedsEstimate({ calories: 1, protein_g: null, fiber_g: 1 })).toBe(true)
    expect(itemNeedsEstimate({ calories: 1, protein_g: 1, fiber_g: null })).toBe(true)
  })
  it('treats undefined (pre-migration data) like null', () => {
    expect(itemNeedsEstimate({ calories: 100 })).toBe(true)
  })
})

describe('nutrientPatch', () => {
  it('fills every missing field the result has', () => {
    const item = { calories: null, protein_g: null, fiber_g: null }
    expect(nutrientPatch(item, result({ calories: 95, protein_g: 0.5, fiber_g: 4.4 })))
      .toEqual({ calories: 95, protein_g: 0.5, fiber_g: 4.4 })
  })
  it('never overwrites existing values', () => {
    const item = { calories: 200, protein_g: null, fiber_g: 0 }
    expect(nutrientPatch(item, result({ calories: 95, protein_g: 3, fiber_g: 4 }))).toEqual({ protein_g: 3 })
  })
  it('skips fields the result lacks', () => {
    const item = { calories: null, protein_g: null, fiber_g: null }
    expect(nutrientPatch(item, result({ protein_g: 2 }))).toEqual({ protein_g: 2 })
  })
  it('returns {} when nothing can be filled', () => {
    expect(nutrientPatch({ calories: 1, protein_g: 1, fiber_g: 1 }, result({ calories: 5, protein_g: 5, fiber_g: 5 }))).toEqual({})
    expect(nutrientPatch({ calories: null }, result())).toEqual({})
  })
  it('fills nutrients only when the item has none', () => {
    const nutrients = { carbs_g: 20, sodium_mg: 300 }
    expect(nutrientPatch({ calories: 1, protein_g: 1, fiber_g: 1, nutrients: null }, result({ nutrients })))
      .toEqual({ nutrients })
    expect(nutrientPatch({ calories: 1, protein_g: 1, fiber_g: 1, nutrients: { carbs_g: 5 } }, result({ nutrients })))
      .toEqual({})
  })
  it('fills undefined fields', () => {
    expect(nutrientPatch({ calories: 10 }, result({ protein_g: 1, fiber_g: 2 }))).toEqual({ protein_g: 1, fiber_g: 2 })
  })
})

describe('sumNutrients', () => {
  it('sums every field with no partial flags when all items have values', () => {
    const t = sumNutrients([
      { calories: 100, protein_g: 1.5, fiber_g: 2 },
      { calories: 50, protein_g: 2.5, fiber_g: 1 },
    ])
    expect(t).toEqual({
      calories: 150, protein_g: 4, fiber_g: 3,
      caloriesPartial: false, proteinPartial: false, fiberPartial: false,
      nutrients: {}, nutrientsPartial: [],
    })
  })
  it('flags partial only when some, not all, items have the value', () => {
    const t = sumNutrients([
      { calories: 100, protein_g: null, fiber_g: 2 },
      { calories: null, protein_g: null, fiber_g: null },
    ])
    expect(t.calories).toBe(100)
    expect(t.caloriesPartial).toBe(true)
    expect(t.protein_g).toBe(0)
    expect(t.proteinPartial).toBe(false)
    expect(t.fiber_g).toBe(2)
    expect(t.fiberPartial).toBe(true)
  })
  it('handles undefined fields and an empty list', () => {
    const t = sumNutrients([{ calories: 5 } as never])
    expect(t.protein_g).toBe(0)
    expect(t.proteinPartial).toBe(false)
    expect(sumNutrients([]).caloriesPartial).toBe(false)
  })
  it('sums nutrient keys and flags the ones some items lack', () => {
    const t = sumNutrients([
      { calories: 1, protein_g: 1, fiber_g: 1, nutrients: { carbs_g: 10.1, sodium_mg: 200 } },
      { calories: 1, protein_g: 1, fiber_g: 1, nutrients: { carbs_g: 0.2 } },
      { calories: 1, protein_g: 1, fiber_g: 1, nutrients: null },
    ])
    expect(t.nutrients).toEqual({ carbs_g: 10.3, sodium_mg: 200 })
    expect(t.nutrientsPartial).toEqual(['carbs_g', 'sodium_mg'])
  })
  it('avoids floating point noise', () => {
    expect(sumNutrients([
      { calories: null, protein_g: 0.1, fiber_g: null },
      { calories: null, protein_g: 0.2, fiber_g: null },
    ]).protein_g).toBe(0.3)
  })
})

describe('formatGrams', () => {
  it('drops a trailing .0', () => {
    expect(formatGrams(12)).toBe('12 g')
    expect(formatGrams(12.0)).toBe('12 g')
    expect(formatGrams(0)).toBe('0 g')
  })
  it('keeps one decimal', () => {
    expect(formatGrams(12.5)).toBe('12.5 g')
    expect(formatGrams(0.25)).toBe('0.3 g')
    expect(formatGrams(3.04)).toBe('3 g')
  })
})

describe('formatAmount', () => {
  it('uses whole numbers from 10 up and more decimals for small amounts', () => {
    expect(formatAmount(410.4, 'mg')).toBe('410 mg')
    expect(formatAmount(12.46, 'g')).toBe('12 g')
    expect(formatAmount(2.44, 'µg')).toBe('2.4 µg')
    expect(formatAmount(0.456, 'mg')).toBe('0.46 mg')
    expect(formatAmount(0.5, 'mg')).toBe('0.5 mg')
    expect(formatAmount(0, 'g')).toBe('0 g')
  })
})

describe('percentDailyValue', () => {
  const def = (key: string) => NUTRIENTS.find((n) => n.key === key)!
  it('rounds to a whole percent', () => {
    expect(percentDailyValue(def('sodium_mg'), 1150)).toBe(50)
  })
  it('is null when the FDA sets no Daily Value', () => {
    expect(percentDailyValue(def('sugars_g'), 10)).toBeNull()
  })
})

describe('NUTRIENTS table', () => {
  it('has unique keys whose suffix matches the unit', () => {
    const keys = NUTRIENTS.map((n) => n.key)
    expect(new Set(keys).size).toBe(keys.length)
    const suffix = { g: '_g', mg: '_mg', 'µg': '_ug' } as const
    for (const n of NUTRIENTS) expect(n.key.endsWith(suffix[n.unit])).toBe(true)
  })
})
