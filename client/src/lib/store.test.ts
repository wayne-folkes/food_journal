// Mock the supabase module so its module-level env-var guard does not throw
// during import. The functions under test (todayString, recentDistinct) never
// touch supabase, so no behaviour needs to be faked beyond preventing the throw.
vi.mock('./supabase', () => ({
  supabase: {},
}))

import { todayString, recentDistinct } from './store'
import type { MealWithItems } from '../types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MakeMealOptions {
  consumed_at?: string
  meal_type?: MealWithItems['meal_type']
  items?: Array<{ description: string }>
}

function makeMeal(opts: MakeMealOptions = {}): MealWithItems {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  const items = (opts.items ?? []).map((it, i) => ({
    id: crypto.randomUUID(),
    meal_id: id,
    description: it.description,
    position: i,
    created_at: now,
  }))

  return {
    id,
    user_id: null,
    consumed_at: opts.consumed_at ?? now,
    meal_type: opts.meal_type ?? 'snack',
    raw_input: '',
    created_at: now,
    updated_at: now,
    items,
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
  it('returns an empty array when meals is empty', () => {
    expect(recentDistinct([])).toEqual([])
  })

  it('deduplicates item descriptions case-insensitively', () => {
    const meals: MealWithItems[] = [
      makeMeal({
        consumed_at: '2024-06-15T08:00:00Z',
        items: [{ description: 'coffee' }],
      }),
      makeMeal({
        consumed_at: '2024-06-15T10:00:00Z',
        items: [{ description: 'Coffee' }], // more recent
      }),
    ]

    const result = recentDistinct(meals)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Coffee') // most-recent spelling
  })

  it('respects the n limit', () => {
    const meals: MealWithItems[] = [
      makeMeal({
        consumed_at: '2024-06-15T09:00:00Z',
        items: [
          { description: 'apple' },
          { description: 'banana' },
          { description: 'cherry' },
          { description: 'date' },
          { description: 'elderberry' },
          { description: 'fig' },
        ],
      }),
    ]

    const result = recentDistinct(meals, 3)
    expect(result).toHaveLength(3)
  })

  it('orders results with most-recent meal items first', () => {
    const meals: MealWithItems[] = [
      makeMeal({
        consumed_at: '2024-06-15T09:00:00Z',
        items: [{ description: 'apple' }],
      }),
      makeMeal({
        consumed_at: '2024-06-15T11:00:00Z',
        items: [{ description: 'banana' }],
      }),
      makeMeal({
        consumed_at: '2024-06-15T10:00:00Z',
        items: [{ description: 'cherry' }],
      }),
    ]

    const result = recentDistinct(meals)
    expect(result).toEqual(['banana', 'cherry', 'apple'])
  })

  it('uses the default limit of 5', () => {
    const meals: MealWithItems[] = Array.from({ length: 6 }, (_, i) =>
      makeMeal({
        consumed_at: `2024-06-15T0${i}:00:00Z`,
        items: [{ description: String.fromCharCode(97 + i) }], // a, b, c, ...
      })
    )

    const result = recentDistinct(meals)
    expect(result).toHaveLength(5)
  })

  it('does not mutate the original meals array', () => {
    const meals: MealWithItems[] = [
      makeMeal({ items: [{ description: 'apple' }] }),
      makeMeal({ items: [{ description: 'banana' }] }),
    ]
    const copy = [...meals]
    recentDistinct(meals)
    expect(meals).toEqual(copy)
  })
})
