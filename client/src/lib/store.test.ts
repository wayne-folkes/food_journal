// Mock the supabase module so its module-level env-var guard does not throw
// during import. The functions under test (todayString, recentDistinct) never
// touch supabase, so no behaviour needs to be faked beyond preventing the throw.
vi.mock('./supabase', () => ({
  supabase: {},
}))

import { todayString, recentDistinct } from './store'
import type { Entry } from '../types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<Entry> & { description: string; consumed_at: string }): Entry {
  return {
    id: crypto.randomUUID(),
    user_id: null,
    raw_input: overrides.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// todayString
// ---------------------------------------------------------------------------

describe('todayString', () => {
  it('returns a string matching the YYYY-MM-DD format', () => {
    const result = todayString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches the local date reported by Date', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    expect(todayString()).toBe(`${year}-${month}-${day}`)
  })
})

// ---------------------------------------------------------------------------
// recentDistinct
// ---------------------------------------------------------------------------

describe('recentDistinct', () => {
  it('returns an empty array when entries is empty', () => {
    expect(recentDistinct([])).toEqual([])
  })

  it('deduplicates case-insensitively and keeps the most-recent spelling', () => {
    // "Coffee" appears twice; the later one (higher consumed_at) should be kept
    const entries: Entry[] = [
      makeEntry({ description: 'coffee',  consumed_at: '2024-06-15T08:00:00Z' }),
      makeEntry({ description: 'Coffee',  consumed_at: '2024-06-15T10:00:00Z' }), // more recent
    ]

    const result = recentDistinct(entries)

    expect(result).toHaveLength(1)
    // The description from the most-recent entry is returned first
    expect(result[0]).toBe('Coffee')
  })

  it('respects the n limit', () => {
    const entries: Entry[] = [
      makeEntry({ description: 'apple',   consumed_at: '2024-06-15T09:00:00Z' }),
      makeEntry({ description: 'banana',  consumed_at: '2024-06-15T10:00:00Z' }),
      makeEntry({ description: 'cherry',  consumed_at: '2024-06-15T11:00:00Z' }),
      makeEntry({ description: 'date',    consumed_at: '2024-06-15T12:00:00Z' }),
      makeEntry({ description: 'elderberry', consumed_at: '2024-06-15T13:00:00Z' }),
      makeEntry({ description: 'fig',     consumed_at: '2024-06-15T14:00:00Z' }),
    ]

    const result = recentDistinct(entries, 3)

    expect(result).toHaveLength(3)
  })

  it('orders results by consumed_at descending (most recent first)', () => {
    const entries: Entry[] = [
      makeEntry({ description: 'apple',  consumed_at: '2024-06-15T09:00:00Z' }),
      makeEntry({ description: 'banana', consumed_at: '2024-06-15T11:00:00Z' }),
      makeEntry({ description: 'cherry', consumed_at: '2024-06-15T10:00:00Z' }),
    ]

    const result = recentDistinct(entries)

    expect(result).toEqual(['banana', 'cherry', 'apple'])
  })

  it('uses the default limit of 5 when n is not provided', () => {
    const entries: Entry[] = [
      makeEntry({ description: 'a', consumed_at: '2024-06-15T01:00:00Z' }),
      makeEntry({ description: 'b', consumed_at: '2024-06-15T02:00:00Z' }),
      makeEntry({ description: 'c', consumed_at: '2024-06-15T03:00:00Z' }),
      makeEntry({ description: 'd', consumed_at: '2024-06-15T04:00:00Z' }),
      makeEntry({ description: 'e', consumed_at: '2024-06-15T05:00:00Z' }),
      makeEntry({ description: 'f', consumed_at: '2024-06-15T06:00:00Z' }),
    ]

    const result = recentDistinct(entries)

    expect(result).toHaveLength(5)
    // Most recent five: f, e, d, c, b (a is cut off)
    expect(result).toEqual(['f', 'e', 'd', 'c', 'b'])
  })

  it('does not mutate the original entries array', () => {
    const entries: Entry[] = [
      makeEntry({ description: 'apple',  consumed_at: '2024-06-15T09:00:00Z' }),
      makeEntry({ description: 'banana', consumed_at: '2024-06-15T10:00:00Z' }),
    ]
    const copy = [...entries]

    recentDistinct(entries)

    expect(entries).toEqual(copy)
  })

  it('handles mixed-case duplicates across many entries correctly', () => {
    const entries: Entry[] = [
      makeEntry({ description: 'Oatmeal', consumed_at: '2024-06-15T07:00:00Z' }),
      makeEntry({ description: 'OATMEAL', consumed_at: '2024-06-15T08:00:00Z' }),
      makeEntry({ description: 'oatmeal', consumed_at: '2024-06-15T09:00:00Z' }), // most recent
      makeEntry({ description: 'yogurt',  consumed_at: '2024-06-15T06:00:00Z' }),
    ]

    const result = recentDistinct(entries)

    // Only one oatmeal variant (the most recent) plus yogurt
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('oatmeal') // most-recent oatmeal variant
    expect(result[1]).toBe('yogurt')
  })
})
