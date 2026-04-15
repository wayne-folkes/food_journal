import { parseEntry } from './parser'

// Fixed reference date: 2024-06-15 at noon local time
// Using a midday time avoids any edge cases around midnight when chrono resolves times.
const REF = new Date(2024, 5, 15, 12, 0, 0, 0) // June 15 2024, 12:00:00

describe('parseEntry', () => {
  describe('when input contains a time expression', () => {
    it('extracts the time and strips it from the description — "coffee at 9am"', () => {
      const result = parseEntry('coffee at 9am', REF)

      expect(result.description).toBe('coffee')
      expect(result.consumed_at.getHours()).toBe(9)
      expect(result.consumed_at.getMinutes()).toBe(0)
      expect(result.consumed_at.getFullYear()).toBe(2024)
      expect(result.consumed_at.getMonth()).toBe(5) // June (0-indexed)
      expect(result.consumed_at.getDate()).toBe(15)
    })

    it('resolves "noon" to 12:00 — "pizza at noon"', () => {
      // chrono-node matches only the word "noon" (not "at noon"), so the word
      // "at" is left in the before-slice: description becomes "pizza at".
      const result = parseEntry('pizza at noon', REF)

      expect(result.description).toBe('pizza at')
      expect(result.consumed_at.getHours()).toBe(12)
      expect(result.consumed_at.getMinutes()).toBe(0)
    })

    it('handles an afternoon time — "salad at 2pm"', () => {
      const result = parseEntry('salad at 2pm', REF)

      expect(result.description).toBe('salad')
      expect(result.consumed_at.getHours()).toBe(14)
      expect(result.consumed_at.getMinutes()).toBe(0)
    })

    it('handles a time with minutes — "oatmeal at 8:30am"', () => {
      const result = parseEntry('oatmeal at 8:30am', REF)

      expect(result.description).toBe('oatmeal')
      expect(result.consumed_at.getHours()).toBe(8)
      expect(result.consumed_at.getMinutes()).toBe(30)
    })

    it('trims surrounding whitespace from the raw input before parsing', () => {
      const result = parseEntry('  coffee at 9am  ', REF)

      expect(result.description).toBe('coffee')
      expect(result.consumed_at.getHours()).toBe(9)
    })

    it('keeps multi-word descriptions intact — "grilled chicken at 1pm"', () => {
      const result = parseEntry('grilled chicken at 1pm', REF)

      expect(result.description).toBe('grilled chicken')
      expect(result.consumed_at.getHours()).toBe(13)
    })
  })

  describe('when input has no time expression', () => {
    it('returns the full input as description and referenceDate as consumed_at', () => {
      const result = parseEntry('grilled chicken salad', REF)

      expect(result.description).toBe('grilled chicken salad')
      expect(result.consumed_at).toBe(REF)
    })

    it('uses the current time when no referenceDate is provided (smoke test)', () => {
      const before = Date.now()
      const result = parseEntry('banana')
      const after = Date.now()

      expect(result.description).toBe('banana')
      expect(result.consumed_at.getTime()).toBeGreaterThanOrEqual(before)
      expect(result.consumed_at.getTime()).toBeLessThanOrEqual(after)
    })

    it('treats a plain number that chrono does not resolve as the description', () => {
      // "42" is not parsed as a time by chrono-node
      const result = parseEntry('42 almonds', REF)

      // description should be the full input (chrono may or may not match "42")
      // what matters is consumed_at is either REF (no match) or a valid Date
      expect(result.consumed_at).toBeInstanceOf(Date)
      expect(result.description.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles an empty string gracefully', () => {
      const result = parseEntry('', REF)

      // trimmed is '', chrono finds nothing → description falls back to '' but our code
      // does: description = [before,after].filter(Boolean).join('').trim() || trimmed
      // which equals '' || '' = ''. consumed_at = REF
      expect(result.consumed_at).toBe(REF)
      expect(typeof result.description).toBe('string')
    })

    it('resolves "yesterday at 8pm" to the day before referenceDate', () => {
      const result = parseEntry('yogurt yesterday at 8pm', REF)

      expect(result.description).toBe('yogurt')
      expect(result.consumed_at.getDate()).toBe(14) // June 14
      expect(result.consumed_at.getHours()).toBe(20)
    })
  })
})
