import { supabase } from './supabase'
import type { LookupItem, LookupResult } from '../../../shared/usda-lookup'

export async function lookupCalories(items: LookupItem[]): Promise<LookupResult[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch('/api/usda-lookup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ items })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error ?? `USDA lookup failed: ${response.status}`)
  }

  const data = await response.json()
  return data.results as LookupResult[]
}
