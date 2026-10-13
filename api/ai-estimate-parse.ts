import type { LookupItem } from '../shared/usda-lookup'

const MAX_PLAUSIBLE_CALORIES = 5000

/**
 * Pulls `[{ "id": string, "calories": number }]` out of a model reply.
 * Tolerates code fences and surrounding prose; drops unknown ids and
 * implausible values so a bad completion can never write garbage calories.
 */
export function parseAiEstimates(text: string, requested: LookupItem[]): Map<string, number> {
  const estimates = new Map<string, number>()
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end <= start) return estimates

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    return estimates
  }
  if (!Array.isArray(parsed)) return estimates

  const requestedIds = new Set(requested.map((item) => item.id))
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue
    const { id, calories } = entry as { id?: unknown; calories?: unknown }
    if (typeof id !== 'string' || !requestedIds.has(id)) continue
    if (typeof calories !== 'number' || !Number.isFinite(calories)) continue
    if (calories <= 0 || calories > MAX_PLAUSIBLE_CALORIES) continue
    estimates.set(id, Math.round(calories))
  }
  return estimates
}
