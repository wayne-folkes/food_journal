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
  source: 'cache' | 'usda' | 'ai' | 'not_found'
}
