import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'

interface Props {
  user: {
    email?: string
    user_metadata?: { avatar_url?: string; full_name?: string }
  } | null
  isAdmin?: boolean
  onExportPdf?: () => void
}

export function AuthButton({ user, isAdmin, onExportPdf }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [flushing, setFlushing] = useState(false)
  const toast = useToast()

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
  }

  async function handleFlushCache() {
    setMenuOpen(false)
    if (!confirm('Flush the entire food_lookup cache? All cached USDA values will be re-fetched on next lookup.')) return
    setFlushing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/admin/flush-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
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

  if (!user) {
    return (
      <button className="btn btn--outline" onClick={signIn}>
        Sign in with Google
      </button>
    )
  }

  return (
    <div className="auth-user" style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        className="auth-user__trigger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-label="User menu"
      >
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata.full_name ?? 'avatar'}
            className="auth-user__avatar"
            referrerPolicy="no-referrer"
          />
        )}
        <span className="auth-user__name">{user.user_metadata?.full_name ?? user.email}</span>
        <span className="auth-user__chevron" aria-hidden="true">›</span>
      </button>

      {/* Backdrop */}
      {menuOpen && (
        <div className="auth-user__backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* Dropdown */}
      {menuOpen && (
        <div className="auth-user__menu" role="menu">
          {isAdmin && (
            <button
              className="auth-user__menu-item auth-user__menu-item--danger"
              role="menuitem"
              onClick={handleFlushCache}
              disabled={flushing}
            >
              {flushing ? 'Flushing…' : 'Purge cache'}
            </button>
          )}
          <button
            className="auth-user__menu-item"
            role="menuitem"
            onClick={() => { setMenuOpen(false); onExportPdf?.() }}
          >
            Export PDF
          </button>
          <button
            className="auth-user__menu-item"
            role="menuitem"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
