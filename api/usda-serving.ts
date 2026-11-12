/**
 * Serving-size helpers for USDA lookups. Pure (no env, no network) so they can
 * be unit-tested.
 *
 * USDA reports nutrients per 100 g; the app logs one typical serving. The
 * serving weight comes from the `foodPortions` array of the food details
 * endpoint. Every field is treated as optional because the shape is unverified.
 */

export interface UsdaFoodPortion {
  gramWeight?: number
  sequenceNumber?: number
}

export interface Per100g {
  calories: number | null
  protein_g: number | null
  fiber_g: number | null
}

/** Weight used when USDA gave no usable portion: values stay per 100 g. */
export const DEFAULT_SERVING_G = 100

/**
 * Grams of the first listed portion (lowest sequenceNumber; missing sorts last,
 * ties keep array order), ignoring portions without a finite positive gramWeight.
 */
export function pickServingGrams(foodPortions: UsdaFoodPortion[] | undefined | null): number | null {
  if (!Array.isArray(foodPortions)) return null
  let best: UsdaFoodPortion | null = null
  let bestSeq = Infinity
  for (const p of foodPortions) {
    const grams = p?.gramWeight
    if (typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0) continue
    const seq = typeof p.sequenceNumber === 'number' && Number.isFinite(p.sequenceNumber)
      ? p.sequenceNumber
      : Infinity
    // Strict < keeps the earlier entry on ties
    if (best === null || seq < bestSeq) {
      best = p
      bestSeq = seq
    }
  }
  return best?.gramWeight ?? null
}

/** Per-100g values -> one serving. Calories to an integer, protein/fiber to 0.1 g; nulls stay null. */
export function scaleToServing(per100g: Per100g, servingG: number | null | undefined): Per100g {
  const grams = typeof servingG === 'number' && Number.isFinite(servingG) && servingG > 0
    ? servingG
    : DEFAULT_SERVING_G
  const factor = grams / 100
  return {
    calories: per100g.calories === null ? null : Math.round(per100g.calories * factor),
    protein_g: per100g.protein_g === null ? null : Math.round(per100g.protein_g * factor * 10) / 10,
    fiber_g: per100g.fiber_g === null ? null : Math.round(per100g.fiber_g * factor * 10) / 10,
  }
}
