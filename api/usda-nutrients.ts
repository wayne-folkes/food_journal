/**
 * Pulls calories, protein and fiber out of a USDA `foodNutrients` array.
 *
 * Pure on purpose (no env, no network) so it can be unit-tested. Handles both
 * response shapes: the search endpoint uses nutrientNumber/nutrientName/value,
 * the details endpoint uses number/name/amount.
 */

export interface UsdaFoodNutrient {
  nutrientNumber?: string
  number?: string
  nutrientName?: string
  name?: string
  value?: number
  amount?: number
  unitName?: string
}

export interface UsdaNutrients {
  calories: number | null
  protein_g: number | null
  fiber_g: number | null
}

const ENERGY_NUMBER = '208'
const PROTEIN_NUMBER = '203'
const FIBER_NUMBER = '291' // total dietary fiber

function numberOf(nutrient: UsdaFoodNutrient): string {
  return String(nutrient.nutrientNumber ?? nutrient.number)
}

function amountOf(nutrient: UsdaFoodNutrient | undefined): number | null {
  const amount = nutrient?.value ?? nutrient?.amount
  return amount != null && Number.isFinite(amount) ? amount : null
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Calories are required: without them the item stays unresolved and all three
 * fields are null. Given calories, a missing protein or fiber value means USDA
 * did not report it (common for animal foods and fiber), so it is stored as 0.
 * Otherwise those items would re-request estimates forever.
 */
export function extractUsdaNutrients(foodNutrients: UsdaFoodNutrient[] | undefined): UsdaNutrients {
  const nutrients = foodNutrients ?? []

  const energy = nutrients.find((n) =>
    numberOf(n) === ENERGY_NUMBER ||
    ((n.nutrientName ?? n.name) === 'Energy' && (n.unitName ?? '').toUpperCase() === 'KCAL')
  )
  const calories = amountOf(energy)
  if (calories === null) return { calories: null, protein_g: null, fiber_g: null }

  const protein = amountOf(nutrients.find((n) => numberOf(n) === PROTEIN_NUMBER))
  const fiber = amountOf(nutrients.find((n) => numberOf(n) === FIBER_NUMBER))

  return {
    calories: Math.round(calories),
    protein_g: protein === null ? 0 : roundToTenth(protein),
    fiber_g: fiber === null ? 0 : roundToTenth(fiber),
  }
}
