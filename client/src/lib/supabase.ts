import { createClient } from '@supabase/supabase-js'
import type { Database } from '@shared/types/database'
import { log } from './logger'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key'

if (
  supabaseUrl === 'https://placeholder.supabase.co' ||
  supabaseAnonKey === 'placeholder-anon-key'
) {
  log.withMetadata({
    hint: 'Copy client/.env.example → client/.env.local and fill in your Supabase credentials',
    fallback: 'Anonymous local logging still works without them',
  }).warn('Missing Supabase configuration')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
