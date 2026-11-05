import { describe, expect, it } from 'vitest'
import { parseAiEstimates } from '../../../api/ai-estimate-parse'
import { calorieSourceLabel } from './caloriesLookup'
import type { LookupResult } from '../../../shared/usda-lookup'

const items = [
  { id: 'a', description: '2 eggs' },
  { id: 'b', description: 'grandma lasagna' },
]

describe('parseAiEstimates', () => {
  it('parses a clean JSON array and rounds calories', () => {
    const out = parseAiEstimates(
      '[{"id":"a","calories":143.6,"protein_g":12,"fiber_g":1},{"id":"b","calories":420,"protein_g":30,"fiber_g":2}]',
      items
    )
    expect(out.get('a')?.calories).toBe(144)
    expect(out.get('b')?.calories).toBe(420)
  })

  it('keeps protein and fiber when present, rounded to 0.1 g', () => {
    const out = parseAiEstimates(
      '[{"id":"a","calories":143,"protein_g":12.34,"fiber_g":0.56}]',
      items
    )
    expect(out.get('a')).toEqual({ calories: 143, protein_g: 12.3, fiber_g: 0.6 })
  })

  it('treats 0 as a valid macro value', () => {
    const out = parseAiEstimates('[{"id":"a","calories":90,"protein_g":0,"fiber_g":0}]', items)
    expect(out.get('a')).toEqual({ calories: 90, protein_g: 0, fiber_g: 0 })
  })

  it('nulls missing macros but keeps the entry', () => {
    const out = parseAiEstimates('[{"id":"a","calories":140}]', items)
    expect(out.get('a')).toEqual({ calories: 140, protein_g: null, fiber_g: null })
  })

  it('nulls only the implausible macro and keeps the rest', () => {
    const out = parseAiEstimates(
      '[{"id":"a","calories":500,"protein_g":301,"fiber_g":4}]',
      items
    )
    expect(out.get('a')).toEqual({ calories: 500, protein_g: null, fiber_g: 4 })
  })

  it('nulls negative and non-numeric macros', () => {
    const out = parseAiEstimates(
      '[{"id":"a","calories":200,"protein_g":-1,"fiber_g":101},{"id":"b","calories":300,"protein_g":"lots","fiber_g":null}]',
      items
    )
    expect(out.get('a')).toEqual({ calories: 200, protein_g: null, fiber_g: null })
    expect(out.get('b')).toEqual({ calories: 300, protein_g: null, fiber_g: null })
  })

  it('tolerates code fences and surrounding prose', () => {
    const out = parseAiEstimates(
      'Sure!\n```json\n[{"id":"a","calories":140,"protein_g":5,"fiber_g":2}]\n```',
      items
    )
    expect([...out]).toEqual([['a', { calories: 140, protein_g: 5, fiber_g: 2 }]])
  })

  it('drops unknown ids, non-numbers and implausible calories', () => {
    const out = parseAiEstimates(
      '[{"id":"zzz","calories":100,"protein_g":1,"fiber_g":1},{"id":"a","calories":"lots","protein_g":1,"fiber_g":1},{"id":"b","calories":99999,"protein_g":1,"fiber_g":1},{"id":"a","calories":-5,"protein_g":1,"fiber_g":1}]',
      items
    )
    expect(out.size).toBe(0)
  })

  it('drops an entry with bad calories even when its macros are valid', () => {
    const out = parseAiEstimates(
      '[{"id":"a","calories":0,"protein_g":10,"fiber_g":3},{"id":"b","protein_g":10,"fiber_g":3}]',
      items
    )
    expect(out.size).toBe(0)
  })

  it('returns empty on garbage', () => {
    expect(parseAiEstimates('no json here', items).size).toBe(0)
    expect(parseAiEstimates('[{broken', items).size).toBe(0)
  })
})

describe('calorieSourceLabel', () => {
  const r = (source: LookupResult['source'], calories: number | null = 100): LookupResult =>
    ({ id: 'x', description: 'x', calories, protein_g: null, fiber_g: null, source })

  it('labels by source', () => {
    expect(calorieSourceLabel([r('usda')])).toBe('USDA')
    expect(calorieSourceLabel([r('ai')])).toBe('AI')
    expect(calorieSourceLabel([r('cache'), r('ai')])).toBe('USDA and AI')
    expect(calorieSourceLabel([r('not_found', null)])).toBe('USDA')
  })
})
