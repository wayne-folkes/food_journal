import { describe, expect, it } from 'vitest'
import { extractUsdaNutrients } from '../../../api/usda-nutrients'

// Search endpoint shape: nutrientNumber / nutrientName / value
const searchShape = [
  { nutrientNumber: '208', nutrientName: 'Energy', unitName: 'KCAL', value: 52.4 },
  { nutrientNumber: '203', nutrientName: 'Protein', unitName: 'G', value: 0.26 },
  { nutrientNumber: '291', nutrientName: 'Fiber, total dietary', unitName: 'G', value: 2.4 },
]

// Details endpoint shape: number / name / amount
const detailsShape = [
  { number: '208', name: 'Energy', unitName: 'kcal', amount: 52.4 },
  { number: '203', name: 'Protein', unitName: 'g', amount: 12.345 },
  { number: '291', name: 'Fiber, total dietary', unitName: 'g', amount: 3.04 },
]

describe('extractUsdaNutrients', () => {
  it('extracts all three when present (search endpoint shape)', () => {
    expect(extractUsdaNutrients(searchShape)).toEqual({ calories: 52, protein_g: 0.3, fiber_g: 2.4 })
  })

  it('extracts all three when present (details endpoint shape)', () => {
    expect(extractUsdaNutrients(detailsShape)).toEqual({ calories: 52, protein_g: 12.3, fiber_g: 3 })
  })

  it('stores fiber as 0 when USDA omits it', () => {
    const nutrients = searchShape.filter((n) => n.nutrientNumber !== '291')
    expect(extractUsdaNutrients(nutrients)).toEqual({ calories: 52, protein_g: 0.3, fiber_g: 0 })
  })

  it('stores protein as 0 when USDA omits it', () => {
    const nutrients = detailsShape.filter((n) => n.number !== '203')
    expect(extractUsdaNutrients(nutrients)).toEqual({ calories: 52, protein_g: 0, fiber_g: 3 })
  })

  it('returns all null when there is no energy value, even if macros are present', () => {
    const nutrients = [
      { nutrientNumber: '203', nutrientName: 'Protein', unitName: 'G', value: 10 },
      { nutrientNumber: '291', nutrientName: 'Fiber', unitName: 'G', value: 4 },
    ]
    expect(extractUsdaNutrients(nutrients)).toEqual({ calories: null, protein_g: null, fiber_g: null })
  })

  it('does not treat kJ energy as calories', () => {
    const nutrients = [
      { nutrientNumber: '268', nutrientName: 'Energy', unitName: 'kJ', value: 218 },
    ]
    expect(extractUsdaNutrients(nutrients)).toEqual({ calories: null, protein_g: null, fiber_g: null })
  })

  it('matches energy by name and KCAL unit when the number is absent', () => {
    const nutrients = [{ nutrientName: 'Energy', unitName: 'KCAL', value: 100 }]
    expect(extractUsdaNutrients(nutrients).calories).toBe(100)
  })

  it('returns all null for an empty or missing nutrient list', () => {
    const allNull = { calories: null, protein_g: null, fiber_g: null }
    expect(extractUsdaNutrients([])).toEqual(allNull)
    expect(extractUsdaNutrients(undefined)).toEqual(allNull)
  })

  it('rounds calories to whole kcal and macros to one decimal', () => {
    const nutrients = [
      { number: '208', amount: 143.6 },
      { number: '203', amount: 12.36 },
      { number: '291', amount: 1.04 },
    ]
    expect(extractUsdaNutrients(nutrients)).toEqual({ calories: 144, protein_g: 12.4, fiber_g: 1 })
  })
})
