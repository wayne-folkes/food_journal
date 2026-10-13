import { describe, expect, it } from 'vitest'
import { parseAiEstimates } from '../../../api/ai-estimate-parse'
import { calorieSourceLabel } from './caloriesLookup'
import type { LookupResult } from '../../../shared/usda-lookup'

const items = [
  { id: 'a', description: '2 eggs' },
  { id: 'b', description: 'grandma lasagna' },
]

describe('parseAiEstimates', () => {
  it('parses a clean JSON array and rounds', () => {
    const out = parseAiEstimates('[{"id":"a","calories":143.6},{"id":"b","calories":420}]', items)
    expect(out.get('a')).toBe(144)
    expect(out.get('b')).toBe(420)
  })

  it('tolerates code fences and surrounding prose', () => {
    const out = parseAiEstimates('Sure!\n```json\n[{"id":"a","calories":140}]\n```', items)
    expect([...out]).toEqual([['a', 140]])
  })

  it('drops unknown ids, non-numbers and implausible values', () => {
    const out = parseAiEstimates(
      '[{"id":"zzz","calories":100},{"id":"a","calories":"lots"},{"id":"b","calories":99999},{"id":"a","calories":-5}]',
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
    ({ id: 'x', description: 'x', calories, source })

  it('labels by source', () => {
    expect(calorieSourceLabel([r('usda')])).toBe('USDA')
    expect(calorieSourceLabel([r('ai')])).toBe('AI')
    expect(calorieSourceLabel([r('cache'), r('ai')])).toBe('USDA and AI')
    expect(calorieSourceLabel([r('not_found', null)])).toBe('USDA')
  })
})
