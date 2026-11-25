import { NUTRIENTS, roundNutrient, type ItemNutrients, type NutrientUnit } from '../shared/nutrients'

/**
 * Pulls calories, protein, fiber and every nutrient in shared/nutrients.ts out
 * of a USDA `foodNutrients` array.
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
  /** null only when calories are missing; otherwise holds whatever USDA reported. */
  nutrients: ItemNutrients | null
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

/** Micrograms per unit, for converting what USDA reports into the unit we store. */
const MICROGRAMS: Record<string, number> = { G: 1_000_000, MG: 1_000, UG: 1 }
const STORED_MICROGRAMS: Record<NutrientUnit, number> = { g: 1_000_000, mg: 1_000, 'µg': 1 }

/** `amount` converted from USDA's `unitName` into `unit`; null for units we can't convert (e.g. IU). */
function inUnit(nutrient: UsdaFoodNutrient, amount: number, unit: NutrientUnit): number | null {
  if (!nutrient.unitName) return amount
  // USDA writes micrograms as "UG"; normalize µ/μ first (µ upper-cases to Greek Μ)
  const from = MICROGRAMS[nutrient.unitName.replace(/[µμ]/g, 'u').toUpperCase()]
  if (from === undefined) return null
  return (amount * from) / STORED_MICROGRAMS[unit]
}

/** Every nutrient in the shared table that USDA reported. Missing ones are left out (unknown, not zero). */
function extractExtras(nutrients: UsdaFoodNutrient[]): ItemNutrients {
  const extras: ItemNutrients = {}
  for (const def of NUTRIENTS) {
    for (const number of def.usdaNumbers) {
      const nutrient = nutrients.find((n) => numberOf(n) === number)
      const amount = nutrient ? amountOf(nutrient) : null
      const converted = nutrient && amount !== null ? inUnit(nutrient, amount, def.unit) : null
      if (converted !== null && converted >= 0) {
        extras[def.key] = roundNutrient(converted)
        break
      }
    }
  }
  return extras
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
  if (calories === null) return { calories: null, protein_g: null, fiber_g: null, nutrients: null }

  const protein = amountOf(nutrients.find((n) => numberOf(n) === PROTEIN_NUMBER))
  const fiber = amountOf(nutrients.find((n) => numberOf(n) === FIBER_NUMBER))

  return {
    calories: Math.round(calories),
    protein_g: protein === null ? 0 : roundToTenth(protein),
    fiber_g: fiber === null ? 0 : roundToTenth(fiber),
    nutrients: extractExtras(nutrients),
  }
}
