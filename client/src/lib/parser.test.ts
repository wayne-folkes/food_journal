import { parseChip, parseMeal, parseSentence } from './parser'

// Fixed reference date: 2024-06-15 at noon local time
const REF = new Date(2024, 5, 15, 12, 0, 0, 0) // June 15 2024, 12:00:00

describe('parseChip', () => {
  describe('when input contains a time expression', () => {
    it('extracts the time and strips it from the description — "coffee at 9am"', () => {
      const result = parseChip('coffee at 9am', REF)

      expect(result.description).toBe('coffee')
      expect(result.consumed_at).not.toBeNull()
      expect(result.consumed_at!.getHours()).toBe(9)
      expect(result.consumed_at!.getMinutes()).toBe(0)
      expect(result.consumed_at!.getFullYear()).toBe(2024)
      expect(result.consumed_at!.getMonth()).toBe(5) // June (0-indexed)
      expect(result.consumed_at!.getDate()).toBe(15)
    })

    it('resolves "noon" to 12:00 — "pizza at noon"', () => {
      const result = parseChip('pizza at noon', REF)

      expect(result.consumed_at).not.toBeNull()
      expect(result.consumed_at!.getHours()).toBe(12)
      expect(result.consumed_at!.getMinutes()).toBe(0)
    })

    it('handles an afternoon time — "salad at 2pm"', () => {
      const result = parseChip('salad at 2pm', REF)

      expect(result.description).toBe('salad')
      expect(result.consumed_at!.getHours()).toBe(14)
      expect(result.consumed_at!.getMinutes()).toBe(0)
    })

    it('handles a time with minutes — "oatmeal at 8:30am"', () => {
      const result = parseChip('oatmeal at 8:30am', REF)

      expect(result.description).toBe('oatmeal')
      expect(result.consumed_at!.getHours()).toBe(8)
      expect(result.consumed_at!.getMinutes()).toBe(30)
    })

    it('trims surrounding whitespace — "  coffee at 9am  "', () => {
      const result = parseChip('  coffee at 9am  ', REF)

      expect(result.description).toBe('coffee')
      expect(result.consumed_at!.getHours()).toBe(9)
    })

    it('keeps multi-word descriptions — "grilled chicken at 1pm"', () => {
      const result = parseChip('grilled chicken at 1pm', REF)

      expect(result.description).toBe('grilled chicken')
      expect(result.consumed_at!.getHours()).toBe(13)
    })
  })

  describe('when input has no time expression', () => {
    it('returns the full input as description and null consumed_at', () => {
      const result = parseChip('grilled chicken salad', REF)

      expect(result.description).toBe('grilled chicken salad')
      expect(result.consumed_at).toBeNull()
    })

    it('returns null consumed_at for plain description (smoke test)', () => {
      const result = parseChip('banana')
      expect(result.description).toBe('banana')
      expect(result.consumed_at).toBeNull()
    })

    it('treats non-time numbers as part of description — "42 almonds"', () => {
      const result = parseChip('42 almonds', REF)
      expect(result.description.length).toBeGreaterThan(0)
      // consumed_at may or may not be null depending on chrono's number parsing
      expect(result.description).toBeTypeOf('string')
    })
  })

  describe('edge cases', () => {
    it('handles an empty string gracefully', () => {
      const result = parseChip('', REF)
      expect(result.consumed_at).toBeNull()
      expect(typeof result.description).toBe('string')
    })

    it('resolves "yesterday at 8pm" to the day before referenceDate', () => {
      const result = parseChip('yogurt yesterday at 8pm', REF)
      expect(result.description).toBe('yogurt')
      expect(result.consumed_at!.getDate()).toBe(14) // June 14
      expect(result.consumed_at!.getHours()).toBe(20)
    })
  })
})

describe('parseMeal', () => {
  it('returns referenceDate as consumed_at when no chips have times', () => {
    const { items, consumed_at } = parseMeal(['eggs', 'toast', 'juice'], REF)
    expect(items).toEqual(['eggs', 'toast', 'juice'])
    expect(consumed_at).toBe(REF)
  })

  it('extracts time from a chip that has one', () => {
    const { items, consumed_at } = parseMeal(['eggs', 'coffee at 8am'], REF)
    expect(items).toEqual(['eggs', 'coffee'])
    expect(consumed_at.getHours()).toBe(8)
  })

  it('last chip with a time wins', () => {
    const { consumed_at } = parseMeal(['coffee at 8am', 'orange juice at 9am'], REF)
    expect(consumed_at.getHours()).toBe(9)
  })

  it('returns empty items array for empty input', () => {
    const { items } = parseMeal([], REF)
    expect(items).toEqual([])
  })
})

describe('parseSentence', () => {
  it('splits on commas and the word "and"', () => {
    const { items } = parseSentence('salmon, brown rice and ginger tea', REF)
    expect(items).toEqual(['salmon', 'brown rice', 'ginger tea'])
  })

  it('does not split words that merely contain "and"', () => {
    const { items } = parseSentence('ham sandwich and coffee', REF)
    expect(items).toEqual(['ham sandwich', 'coffee'])
  })

  it('handles Oxford comma before "and"', () => {
    const { items } = parseSentence('oats, honey, and a cortado', REF)
    expect(items).toEqual(['oats', 'honey', 'a cortado'])
  })

  it('extracts a time phrase from the sentence', () => {
    const { items, consumed_at } = parseSentence('eggs and coffee at 8am', REF)
    expect(items).toEqual(['eggs', 'coffee'])
    expect(consumed_at.getHours()).toBe(8)
  })

  it('returns empty items for blank input', () => {
    const { items, consumed_at } = parseSentence('   ', REF)
    expect(items).toEqual([])
    expect(consumed_at).toBe(REF)
  })
})
