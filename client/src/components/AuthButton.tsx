import { supabase } from '../lib/supabase'

interface Props {
  user: { email?: string; user_metadata?: { avatar_url?: string; full_name?: string } } | null
}

export function AuthButton({ user }: Props) {
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (!user) {
    return (
      <button className="btn btn--outline" onClick={signIn}>
        Sign in with Google
      </button>
    )
  }

  return (
    <div className="auth-user">
      {user.user_metadata?.avatar_url && (
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata.full_name ?? 'avatar'}
          className="auth-user__avatar"
        />
      )}
      <span className="auth-user__name">{user.user_metadata?.full_name ?? user.email}</span>
      <button className="btn btn--ghost btn--sm" onClick={signOut}>
        Sign out
      </button>
    </div>
  )
}
