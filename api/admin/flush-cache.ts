import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'wayne.folkes@gmail.com'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabaseAnon = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify JWT
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Admin-only
  if (user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    // Delete all rows — TRUNCATE isn't available via JS client, use DELETE
    const { error } = await supabaseAdmin
      .from('food_lookup')
      .delete()
      .neq('description_key', '')   // matches all rows

    if (error) throw error

    return res.status(200).json({ ok: true, message: 'food_lookup cache flushed' })
  } catch (err) {
    console.error('flush-cache error:', err)
    return res.status(500).json({ error: 'Failed to flush cache' })
  }
}
