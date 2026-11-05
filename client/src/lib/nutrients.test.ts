import { describe, it, expect } from 'vitest'
import type { LookupResult } from '@shared/usda-lookup'
import { formatGrams, itemNeedsEstimate, nutrientPatch, sumNutrients } from './nutrients'

function result(partial: Partial<LookupResult> = {}): LookupResult {
  return { id: 'x', description: 'x', calories: null, protein_g: null, fiber_g: null, source: 'usda', ...partial }
}

describe('itemNeedsEstimate', () => {
  it('is false when all three values are present (including 0)', () => {
    expect(itemNeedsEstimate({ calories: 0, protein_g: 0, fiber_g: 0 })).toBe(false)
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
