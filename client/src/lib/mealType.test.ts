import { suggestMealType } from './mealType'

function at(hour: number, minute = 0): Date {
  const d = new Date(2024, 5, 15) // June 15, 2024
  d.setHours(hour, minute, 0, 0)
  return d
}

describe('suggestMealType', () => {
  // Breakfast: 04:00 – 10:29
  it('suggests breakfast at 04:00', () => expect(suggestMealType(at(4, 0))).toBe('breakfast'))
  it('suggests breakfast at 08:00', () => expect(suggestMealType(at(8, 0))).toBe('breakfast'))
  it('suggests breakfast at 10:29', () => expect(suggestMealType(at(10, 29))).toBe('breakfast'))

  // Lunch: 10:30 – 14:29
  it('suggests lunch at 10:30', () => expect(suggestMealType(at(10, 30))).toBe('lunch'))
  it('suggests lunch at 12:00', () => expect(suggestMealType(at(12, 0))).toBe('lunch'))
  it('suggests lunch at 14:29', () => expect(suggestMealType(at(14, 29))).toBe('lunch'))

  // Snack: 14:30 – 16:59
  it('suggests snack at 14:30', () => expect(suggestMealType(at(14, 30))).toBe('snack'))
  it('suggests snack at 15:00', () => expect(suggestMealType(at(15, 0))).toBe('snack'))
  it('suggests snack at 16:59', () => expect(suggestMealType(at(16, 59))).toBe('snack'))

  // Dinner: 17:00 – 20:59
  it('suggests dinner at 17:00', () => expect(suggestMealType(at(17, 0))).toBe('dinner'))
  it('suggests dinner at 19:00', () => expect(suggestMealType(at(19, 0))).toBe('dinner'))
  it('suggests dinner at 20:59', () => expect(suggestMealType(at(20, 59))).toBe('dinner'))

  // Snack: 21:00 – 03:59
  it('suggests snack at 21:00', () => expect(suggestMealType(at(21, 0))).toBe('snack'))
  it('suggests snack at 23:00', () => expect(suggestMealType(at(23, 0))).toBe('snack'))
  it('suggests snack at 01:00', () => expect(suggestMealType(at(1, 0))).toBe('snack'))
  it('suggests snack at 03:59', () => expect(suggestMealType(at(3, 59))).toBe('snack'))

  it('defaults to current time when no argument given (smoke test)', () => {
    const result = suggestMealType()
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack']
    expect(validTypes).toContain(result)
  })
})
