import { createClient } from '@supabase/supabase-js'
import type { Database } from '@shared/types/database'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key'

if (
  supabaseUrl === 'https://placeholder.supabase.co' ||
  supabaseAnonKey === 'placeholder-anon-key'
) {
  console.warn(
    '[food-journal] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Copy client/.env.example → client/.env.local and fill in your Supabase credentials.\n' +
    'Anonymous local logging still works without them.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
