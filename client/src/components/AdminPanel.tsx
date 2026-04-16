import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'

export function AdminPanel() {
  const [flushing, setFlushing] = useState(false)
  const toast = useToast()

  async function handleFlushCache() {
    if (!confirm('Flush the entire food_lookup cache? All cached USDA values will be re-fetched on next lookup.')) return
    setFlushing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/admin/flush-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Unknown error')

      toast.success('Cache flushed — USDA values will be re-fetched on next lookup')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flush cache')
    } finally {
      setFlushing(false)
    }
  }

  return (
    <section className="admin-panel">
      <h2 className="admin-panel__title">Admin</h2>
      <div className="admin-panel__row">
        <div className="admin-panel__info">
          <strong>USDA calorie cache</strong>
          <span>Flush all cached food lookups to force fresh USDA data</span>
        </div>
        <button
          className="btn btn--outline btn--sm btn--danger"
          onClick={handleFlushCache}
          disabled={flushing}
        >
          {flushing ? 'Flushing…' : 'Flush cache'}
        </button>
      </div>
    </section>
  )
}
