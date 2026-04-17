import { track as vercelTrack } from '@vercel/analytics'
import type { MealType } from '@shared/types/database'

/**
 * Canonical list of user-behavior events tracked in the app.
 *
 * Keep this list small and stable — event names are part of the
 * contract, and when iOS ships it will fire the same names so we can
 * compare web-vs-native funnels.
 *
 * Property values must be strings, numbers, booleans, or null (Vercel
 * Analytics constraint). No PII — descriptions/raw input are NOT sent.
 */
type EventMap = {
  meal_logged: { meal_type: MealType; item_count: number; authed: boolean }
  meal_edited: { meal_type: MealType; item_count: number }
  meal_deleted: Record<string, never>
  search_opened: Record<string, never>
  autocomplete_used: Record<string, never>
  calorie_estimate_requested: { item_count: number; trigger: 'auto' | 'manual' }
  view_mode_changed: { mode: 'day' | 'week' }
}

export function track<K extends keyof EventMap>(
  event: K,
  properties: EventMap[K]
): void {
  // Cast through Record<string, unknown> — our EventMap is stricter than
  // Vercel's AllowedPropertyValues, so an unchecked cast would lose type
  // info; this widens intentionally.
  vercelTrack(event, properties as Record<string, string | number | boolean | null>)
}
