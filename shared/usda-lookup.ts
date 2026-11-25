import type { ItemNutrients } from './nutrients'

export interface LookupItem {
  id: string
  description: string
}

export interface LookupResult {
  id: string
  description: string
  calories: number | null
  /** Estimated protein in grams (1 decimal), same basis as `calories`. */
  protein_g: number | null
  /** Estimated dietary fiber in grams (1 decimal), same basis as `calories`. */
  fiber_g: number | null
  /** All other macros/micros, same basis as `calories`; null when nothing was found. */
  nutrients: ItemNutrients | null
  source: 'cache' | 'usda' | 'ai' | 'not_found'
}
