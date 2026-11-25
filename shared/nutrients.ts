/**
 * The nutrients stored in `meal_items.nutrients` (one typical serving) and
 * `food_lookup.nutrients_per_100g` (per 100 g), beyond the calories, protein
 * and fiber columns that predate them.
 *
 * Plain data so it can be hand-translated to Swift: a key, a unit, the USDA
 * FoodData Central nutrient numbers that report it, the FDA Daily Value for
 * adults (2,000 kcal diet; null where the FDA sets none), and a per-serving
 * ceiling above which an AI estimate is treated as garbage.
 *
 * A key missing from a stored object means "unknown", never zero.
 */

export type NutrientUnit = 'g' | 'mg' | 'µg'

export type NutrientGroup = 'macro' | 'mineral' | 'vitamin'

export type NutrientKey =
  | 'carbs_g'
  | 'sugars_g'
  | 'added_sugars_g'
  | 'fat_g'
  | 'saturated_fat_g'
  | 'trans_fat_g'
  | 'monounsaturated_fat_g'
  | 'polyunsaturated_fat_g'
  | 'cholesterol_mg'
  | 'sodium_mg'
  | 'potassium_mg'
  | 'calcium_mg'
  | 'iron_mg'
  | 'magnesium_mg'
  | 'phosphorus_mg'
  | 'zinc_mg'
  | 'copper_mg'
  | 'manganese_mg'
  | 'selenium_ug'
  | 'vitamin_a_ug'
  | 'vitamin_c_mg'
  | 'vitamin_d_ug'
  | 'vitamin_e_mg'
  | 'vitamin_k_ug'
  | 'thiamin_mg'
  | 'riboflavin_mg'
  | 'niacin_mg'
  | 'vitamin_b6_mg'
  | 'folate_ug'
  | 'vitamin_b12_ug'
  | 'choline_mg'

/** JSON shape of `meal_items.nutrients` / `food_lookup.nutrients_per_100g`. Every key optional. */
export interface ItemNutrients {
  carbs_g?: number
  sugars_g?: number
  added_sugars_g?: number
  fat_g?: number
  saturated_fat_g?: number
  trans_fat_g?: number
  monounsaturated_fat_g?: number
  polyunsaturated_fat_g?: number
  cholesterol_mg?: number
  sodium_mg?: number
  potassium_mg?: number
  calcium_mg?: number
  iron_mg?: number
  magnesium_mg?: number
  phosphorus_mg?: number
  zinc_mg?: number
  copper_mg?: number
  manganese_mg?: number
  selenium_ug?: number
  vitamin_a_ug?: number
  vitamin_c_mg?: number
  vitamin_d_ug?: number
  vitamin_e_mg?: number
  vitamin_k_ug?: number
  thiamin_mg?: number
  riboflavin_mg?: number
  niacin_mg?: number
  vitamin_b6_mg?: number
  folate_ug?: number
  vitamin_b12_ug?: number
  choline_mg?: number
}

export interface NutrientDef {
  key: NutrientKey
  label: string
  unit: NutrientUnit
  group: NutrientGroup
  /** USDA FDC nutrient numbers, preferred first (Foundation foods sometimes use the alternate). */
  usdaNumbers: string[]
  /** FDA Daily Value in `unit`; null when none is set. */
  dailyValue: number | null
  /** Per-serving ceiling for AI estimates, in `unit`. */
  maxPlausible: number
  /** Indented under its parent in a nutrition-label layout. */
  indent: boolean
}

export const NUTRIENTS: NutrientDef[] = [
  { key: 'carbs_g', label: 'Carbohydrates', unit: 'g', group: 'macro', usdaNumbers: ['205'], dailyValue: 275, maxPlausible: 1000, indent: false },
  { key: 'sugars_g', label: 'Total sugars', unit: 'g', group: 'macro', usdaNumbers: ['269', '269.3'], dailyValue: null, maxPlausible: 500, indent: true },
  { key: 'added_sugars_g', label: 'Added sugars', unit: 'g', group: 'macro', usdaNumbers: ['539'], dailyValue: 50, maxPlausible: 500, indent: true },
  { key: 'fat_g', label: 'Fat', unit: 'g', group: 'macro', usdaNumbers: ['204', '298'], dailyValue: 78, maxPlausible: 500, indent: false },
  { key: 'saturated_fat_g', label: 'Saturated fat', unit: 'g', group: 'macro', usdaNumbers: ['606'], dailyValue: 20, maxPlausible: 300, indent: true },
  { key: 'trans_fat_g', label: 'Trans fat', unit: 'g', group: 'macro', usdaNumbers: ['605'], dailyValue: null, maxPlausible: 100, indent: true },
  { key: 'monounsaturated_fat_g', label: 'Monounsaturated fat', unit: 'g', group: 'macro', usdaNumbers: ['645'], dailyValue: null, maxPlausible: 300, indent: true },
  { key: 'polyunsaturated_fat_g', label: 'Polyunsaturated fat', unit: 'g', group: 'macro', usdaNumbers: ['646'], dailyValue: null, maxPlausible: 300, indent: true },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', group: 'macro', usdaNumbers: ['601'], dailyValue: 300, maxPlausible: 3000, indent: false },

  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', group: 'mineral', usdaNumbers: ['307'], dailyValue: 2300, maxPlausible: 20000, indent: false },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', group: 'mineral', usdaNumbers: ['306'], dailyValue: 4700, maxPlausible: 20000, indent: false },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', group: 'mineral', usdaNumbers: ['301'], dailyValue: 1300, maxPlausible: 10000, indent: false },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', group: 'mineral', usdaNumbers: ['303'], dailyValue: 18, maxPlausible: 200, indent: false },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', group: 'mineral', usdaNumbers: ['304'], dailyValue: 420, maxPlausible: 5000, indent: false },
  { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg', group: 'mineral', usdaNumbers: ['305'], dailyValue: 1250, maxPlausible: 10000, indent: false },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg', group: 'mineral', usdaNumbers: ['309'], dailyValue: 11, maxPlausible: 200, indent: false },
  { key: 'copper_mg', label: 'Copper', unit: 'mg', group: 'mineral', usdaNumbers: ['312'], dailyValue: 0.9, maxPlausible: 50, indent: false },
  { key: 'manganese_mg', label: 'Manganese', unit: 'mg', group: 'mineral', usdaNumbers: ['315'], dailyValue: 2.3, maxPlausible: 50, indent: false },
  { key: 'selenium_ug', label: 'Selenium', unit: 'µg', group: 'mineral', usdaNumbers: ['317'], dailyValue: 55, maxPlausible: 2000, indent: false },

  { key: 'vitamin_a_ug', label: 'Vitamin A', unit: 'µg', group: 'vitamin', usdaNumbers: ['320'], dailyValue: 900, maxPlausible: 30000, indent: false },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', group: 'vitamin', usdaNumbers: ['401'], dailyValue: 90, maxPlausible: 3000, indent: false },
  { key: 'vitamin_d_ug', label: 'Vitamin D', unit: 'µg', group: 'vitamin', usdaNumbers: ['328'], dailyValue: 20, maxPlausible: 500, indent: false },
  { key: 'vitamin_e_mg', label: 'Vitamin E', unit: 'mg', group: 'vitamin', usdaNumbers: ['323'], dailyValue: 15, maxPlausible: 500, indent: false },
  { key: 'vitamin_k_ug', label: 'Vitamin K', unit: 'µg', group: 'vitamin', usdaNumbers: ['430'], dailyValue: 120, maxPlausible: 5000, indent: false },
  { key: 'thiamin_mg', label: 'Thiamin (B1)', unit: 'mg', group: 'vitamin', usdaNumbers: ['404'], dailyValue: 1.2, maxPlausible: 100, indent: false },
  { key: 'riboflavin_mg', label: 'Riboflavin (B2)', unit: 'mg', group: 'vitamin', usdaNumbers: ['405'], dailyValue: 1.3, maxPlausible: 100, indent: false },
  { key: 'niacin_mg', label: 'Niacin (B3)', unit: 'mg', group: 'vitamin', usdaNumbers: ['406'], dailyValue: 16, maxPlausible: 500, indent: false },
  { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg', group: 'vitamin', usdaNumbers: ['415'], dailyValue: 1.7, maxPlausible: 100, indent: false },
  { key: 'folate_ug', label: 'Folate', unit: 'µg', group: 'vitamin', usdaNumbers: ['435'], dailyValue: 400, maxPlausible: 5000, indent: false },
  { key: 'vitamin_b12_ug', label: 'Vitamin B12', unit: 'µg', group: 'vitamin', usdaNumbers: ['418'], dailyValue: 2.4, maxPlausible: 1000, indent: false },
  { key: 'choline_mg', label: 'Choline', unit: 'mg', group: 'vitamin', usdaNumbers: ['421'], dailyValue: 550, maxPlausible: 5000, indent: false },
]

/** Stored values keep 2 decimals: enough for small amounts like copper (DV 0.9 mg). */
export function roundNutrient(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * A clean copy of untrusted nutrient data: only known keys whose value is a
 * finite number in [0, max] (max = `maxPlausible` when `capped`), rounded.
 * Returns null when `value` is not an object at all.
 */
export function sanitizeNutrients(value: unknown, capped = false): ItemNutrients | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const clean: ItemNutrients = {}
  for (const def of NUTRIENTS) {
    const amount = source[def.key]
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) continue
    if (capped && amount > def.maxPlausible) continue
    clean[def.key] = roundNutrient(amount)
  }
  return clean
}
