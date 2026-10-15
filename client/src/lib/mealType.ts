import type { MealType } from '@shared/types/database'

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

/** Day-flow order used by the compose pill cycle and the week legend. */
export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'dessert', 'drink']

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
 * Ranges (Liquid Glass handoff):
 *   04:00 – 10:29  →  breakfast
 *   10:30 – 14:59  →  lunch
 *   15:00 – 17:29  →  snack
 *   17:30 – 21:29  →  dinner
 *   everything else →  snack (late night / small hours)
 *
 * Dessert and Drink are never auto-suggested; the user picks them explicitly.
 */
export function suggestMealType(date = new Date()): MealType {
  const h = date.getHours()
  const m = date.getMinutes()
  const minutes = h * 60 + m

  if (minutes >= 4 * 60 && minutes < 10 * 60 + 30) return 'breakfast'
  if (minutes >= 10 * 60 + 30 && minutes < 15 * 60) return 'lunch'
  if (minutes >= 17 * 60 + 30 && minutes < 21 * 60 + 30) return 'dinner'
  return 'snack'
}
