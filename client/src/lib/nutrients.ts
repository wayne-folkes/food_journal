// Pure nutrient helpers — no DOM, React or Supabase imports, so the logic can
// be ported to Swift as-is. Every nutrient field is nullable AND may be
// `undefined` at runtime (meals persisted before protein/fiber existed, or RPC
// payloads from a server without migration 0018), so always test `== null`.
import type { MealItem } from '@shared/types/database'
import type { LookupResult } from '@shared/usda-lookup'
import { NUTRIENTS, roundNutrient, type ItemNutrients, type NutrientDef, type NutrientKey, type NutrientUnit } from '@shared/nutrients'

/** Shown wherever space is tight (meal card, day total), next to protein and fiber. The rest sit behind "More nutrients". */
export const HEADLINE_MACROS: NutrientKey[] = ['carbs_g', 'fat_g']

export interface NutrientFields {
  calories?: number | null
  protein_g?: number | null
  fiber_g?: number | null
  nutrients?: ItemNutrients | null
}

export interface NutrientPatch {
  calories?: number
  protein_g?: number
  fiber_g?: number
  nutrients?: ItemNutrients
}

export interface NutrientTotals {
  calories: number
  protein_g: number
  fiber_g: number
  /** True when some, but not all, items have a calorie value. */
  caloriesPartial: boolean
  proteinPartial: boolean
  fiberPartial: boolean
  /** Sums of every other nutrient; a key is present when at least one item has it. */
  nutrients: ItemNutrients
  /** Keys whose sum is missing some items' values. */
  nutrientsPartial: NutrientKey[]
}

/**
 * True when calories, protein or fiber is unknown, or the item was never
 * estimated for the other nutrients. Keys missing inside `nutrients` don't
 * count: plenty of foods legitimately have no value for some micronutrients.
 */
export function itemNeedsEstimate(item: NutrientFields): boolean {
  return item.calories == null || item.protein_g == null || item.fiber_g == null || item.nutrients == null
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
  if (item.nutrients == null && result.nutrients != null) patch.nutrients = result.nutrients
  return patch
}

/** Sums only the items that have each value; `*Partial` flags an incomplete sum. */
export function sumNutrients(
  items: Array<Pick<MealItem, 'calories' | 'protein_g' | 'fiber_g'> & { nutrients?: ItemNutrients | null }>
): NutrientTotals {
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

  const nutrients: ItemNutrients = {}
  const nutrientsPartial: NutrientKey[] = []
  for (const { key } of NUTRIENTS) {
    let sum = 0
    let count = 0
    for (const item of items) {
      const amount = item.nutrients?.[key]
      if (amount != null) { sum += amount; count += 1 }
    }
    if (count === 0) continue
    nutrients[key] = roundNutrient(sum)
    if (count < items.length) nutrientsPartial.push(key)
  }

  return {
    calories,
    // Round away float noise from summing 1-decimal values (0.1 + 0.2)
    protein_g: Math.round(protein * 10) / 10,
    fiber_g: Math.round(fiber * 10) / 10,
    caloriesPartial: calCount > 0 && calCount < items.length,
    proteinPartial: proteinCount > 0 && proteinCount < items.length,
    fiberPartial: fiberCount > 0 && fiberCount < items.length,
    nutrients,
    nutrientsPartial,
  }
}

/** "12 g" or "12.5 g" — a trailing ".0" is dropped. */
export function formatGrams(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} g`
}

/** "410 mg", "12.5 g", "0.45 mg", "2.4 µg": whole numbers from 10 up, otherwise up to 2 significant decimals. */
export function formatAmount(n: number, unit: NutrientUnit): string {
  const decimals = n >= 10 ? 0 : n >= 1 ? 1 : 2
  const factor = 10 ** decimals
  return `${Number((Math.round(n * factor) / factor).toFixed(decimals))} ${unit}`
}

/** Whole-number percent of the FDA Daily Value, or null when there is none. */
export function percentDailyValue(def: NutrientDef, amount: number): number | null {
  return def.dailyValue == null ? null : Math.round((amount / def.dailyValue) * 100)
}
