export interface LookupItem {
  id: string
  description: string
}

export interface LookupResult {
  id: string
  description: string
  calories: number | null
  source: 'cache' | 'usda' | 'not_found'
}
