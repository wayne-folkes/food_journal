// Pure nutrient helpers — no DOM, React or Supabase imports, so the logic can
// be ported to Swift as-is. Every nutrient field is nullable AND may be
// `undefined` at runtime (meals persisted before protein/fiber existed, or RPC
// payloads from a server without migration 0018), so always test `== null`.
import type { MealItem } from '@shared/types/database'
import type { LookupResult } from '@shared/usda-lookup'

export interface NutrientFields {
  calories?: number | null
  protein_g?: number | null
  fiber_g?: number | null
}

export interface NutrientPatch {
  calories?: number
  protein_g?: number
  fiber_g?: number
}

export interface NutrientTotals {
  calories: number
  protein_g: number
  fiber_g: number
  /** True when some, but not all, items have a calorie value. */
  caloriesPartial: boolean
  proteinPartial: boolean
  fiberPartial: boolean
}

/** True when any of calories, protein or fiber is still unknown. */
export function itemNeedsEstimate(item: NutrientFields): boolean {
  return item.calories == null || item.protein_g == null || item.fiber_g == null
}

/**
 * The fields of `result` that can fill gaps on `item`. Only values that are
 * currently unset on the item AND present in the result are included, so a
 * user-entered value is never overwritten. `{}` when there is nothing to fill.
 */
export function nutrientPatch(item: NutrientFields, result: LookupResult): NutrientPatch {
  const patch: NutrientPatch = {}
  if (item.calories == null && result.calories != null) patch.calories = result.calories
  if (item.protein_g == null && result.protein_g != null) patch.protein_g = result.protein_g
  if (item.fiber_g == null && result.fiber_g != null) patch.fiber_g = result.fiber_g
  return patch
}

/** Sums only the items that have each value; `*Partial` flags an incomplete sum. */
export function sumNutrients(items: Array<Pick<MealItem, 'calories' | 'protein_g' | 'fiber_g'>>): NutrientTotals {
  let calories = 0
  let protein = 0
  let fiber = 0
  let calCount = 0
  let proteinCount = 0
  let fiberCount = 0

  for (const item of items) {
    if (item.calories != null) { calories += item.calories; calCount += 1 }
    if (item.protein_g != null) { protein += item.protein_g; proteinCount += 1 }
    if (item.fiber_g != null) { fiber += item.fiber_g; fiberCount += 1 }
  }

  return {
    calories,
    // Round away float noise from summing 1-decimal values (0.1 + 0.2)
    protein_g: Math.round(protein * 10) / 10,
    fiber_g: Math.round(fiber * 10) / 10,
    caloriesPartial: calCount > 0 && calCount < items.length,
    proteinPartial: proteinCount > 0 && proteinCount < items.length,
    fiberPartial: fiberCount > 0 && fiberCount < items.length,
  }
}

/** "12 g" or "12.5 g" — a trailing ".0" is dropped. */
export function formatGrams(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} g`
}
