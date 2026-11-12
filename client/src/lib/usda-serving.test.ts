import { describe, expect, it } from 'vitest'
import { pickServingGrams, scaleToServing } from '../../../api/usda-serving'

describe('pickServingGrams', () => {
  it('returns null when there are no usable portions', () => {
    expect(pickServingGrams(undefined)).toBeNull()
    expect(pickServingGrams(null)).toBeNull()
    expect(pickServingGrams([])).toBeNull()
    expect(pickServingGrams([{}, { gramWeight: 0 }, { gramWeight: -5 }, { gramWeight: NaN }, { gramWeight: Infinity }])).toBeNull()
  })

  it('picks the lowest sequenceNumber', () => {
    expect(pickServingGrams([
      { gramWeight: 50, sequenceNumber: 3 },
      { gramWeight: 28, sequenceNumber: 1 },
      { gramWeight: 10, sequenceNumber: 2 },
    ])).toBe(28)
  })

  it('sorts a missing sequenceNumber last and ignores invalid portions', () => {
    expect(pickServingGrams([
      { gramWeight: 99 },
      { gramWeight: 0, sequenceNumber: 1 },
      { gramWeight: 30, sequenceNumber: 5 },
    ])).toBe(30)
  })

  it('keeps array order on ties', () => {
    expect(pickServingGrams([{ gramWeight: 11, sequenceNumber: 1 }, { gramWeight: 22, sequenceNumber: 1 }])).toBe(11)
    expect(pickServingGrams([{ gramWeight: 11 }, { gramWeight: 22 }])).toBe(11)
  })
})

describe('scaleToServing', () => {
  it('scales and rounds', () => {
    expect(scaleToServing({ calories: 579, protein_g: 21.2, fiber_g: 12.5 }, 28))
      .toEqual({ calories: 162, protein_g: 5.9, fiber_g: 3.5 })
  })

  it('keeps nulls null', () => {
    expect(scaleToServing({ calories: null, protein_g: null, fiber_g: null }, 28))
      .toEqual({ calories: null, protein_g: null, fiber_g: null })
  })

  it('falls back to 100 g without a usable serving', () => {
    const v = { calories: 52, protein_g: 0.3, fiber_g: 2.4 }
    expect(scaleToServing(v, null)).toEqual(v)
    expect(scaleToServing(v, undefined)).toEqual(v)
    expect(scaleToServing(v, 0)).toEqual(v)
  })
})
