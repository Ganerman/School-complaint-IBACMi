import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin.ts'
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { adminClient } = await requireAdmin(req); const { user_id } = await req.json()
    if (!user_id) return json({ error: 'User ID is required' }, 400)
    const { data: profile } = await adminClient.from('profiles').select('email').eq('id', user_id).single()
    if (!profile?.email) return json({ error: 'User not found' }, 404)
    const { error } = await adminClient.auth.resetPasswordForEmail(profile.email)
    return error ? json({ error: 'Unable to send reset email' }, 400) : json({ success: true })
  } catch { return json({ error: 'Unauthorized' }, 401) }
})
