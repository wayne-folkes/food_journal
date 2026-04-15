import type { MealType } from '../types/database'

/** Human-readable labels */
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  dessert: 'Dessert',
  drink: 'Drink',
}

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink']

/**
 * CSS variable name for each meal type's accent color.
 * Defined in index.css as --meal-<type>.
 */
export function mealTypeColor(type: MealType): string {
  return `var(--meal-${type})`
}

/**
 * Suggests a meal type based on the hour of the day (local time).
 *
 * Ranges:
 *   04:00 – 10:29  →  breakfast
 *   10:30 – 14:29  →  lunch
 *   17:00 – 20:59  →  dinner
 *   everything else →  snack
 *
 * Dessert and Drink are never auto-suggested; the user picks them explicitly.
 */
export function suggestMealType(date = new Date()): MealType {
  const h = date.getHours()
  const m = date.getMinutes()
  const minutes = h * 60 + m

  if (minutes >= 4 * 60 && minutes < 10 * 60 + 30) return 'breakfast'
  if (minutes >= 10 * 60 + 30 && minutes < 14 * 60 + 30) return 'lunch'
  if (minutes >= 17 * 60 && minutes < 21 * 60) return 'dinner'
  return 'snack'
}
