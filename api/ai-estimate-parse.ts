import type { LookupItem } from '../shared/usda-lookup'
import { sanitizeNutrients, type ItemNutrients } from '../shared/nutrients'

const MAX_PLAUSIBLE_CALORIES = 5000
const MAX_PLAUSIBLE_PROTEIN_G = 300
const MAX_PLAUSIBLE_FIBER_G = 100

export interface AiEstimate {
  calories: number
  /** null when the model omitted it or gave an implausible value. */
  protein_g: number | null
  /** null when the model omitted it or gave an implausible value. */
  fiber_g: number | null
  /**
   * Other macros/micros; implausible or unknown keys are dropped. null when the
   * model sent no object at all, so the item can be estimated again later.
   */
  nutrients: ItemNutrients | null
}

/** Returns the value rounded to 0.1 g, or null if missing, non-finite, negative or above `max`. */
function macroGrams(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < 0 || value > max) return null
  return Math.round(value * 10) / 10
}

/**
 * Pulls `[{ "id": string, "calories": number, "protein_g": number, "fiber_g": number, "nutrients": {...} }]`
 * out of a model reply. Tolerates code fences and surrounding prose; drops unknown ids
 * and entries with implausible calories so a bad completion can never write garbage.
 * Missing or implausible protein/fiber only nulls that field, and a bad nutrient
 * only drops that key; the entry is kept.
 */
export function parseAiEstimates(text: string, requested: LookupItem[]): Map<string, AiEstimate> {
  const estimates = new Map<string, AiEstimate>()
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
    const { id, calories, protein_g, fiber_g, nutrients } = entry as {
      id?: unknown
      calories?: unknown
      protein_g?: unknown
      fiber_g?: unknown
      nutrients?: unknown
    }
    if (typeof id !== 'string' || !requestedIds.has(id)) continue
    if (typeof calories !== 'number' || !Number.isFinite(calories)) continue
    if (calories <= 0 || calories > MAX_PLAUSIBLE_CALORIES) continue
    estimates.set(id, {
      calories: Math.round(calories),
      protein_g: macroGrams(protein_g, MAX_PLAUSIBLE_PROTEIN_G),
      fiber_g: macroGrams(fiber_g, MAX_PLAUSIBLE_FIBER_G),
      nutrients: sanitizeNutrients(nutrients, true),
    })
  }
  return estimates
}
