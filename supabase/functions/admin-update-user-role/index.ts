import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin.ts'
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { adminClient, user } = await requireAdmin(req); const { user_id, role, specialization } = await req.json()
    if (!user_id || !['student','maintenance','admin'].includes(role) || user_id === user.id) return json({ error: 'Invalid role update' }, 400)
    const cleanSpecialization = role === 'maintenance' ? String(specialization || '').trim().slice(0, 100) || null : null
    const { error } = await adminClient.from('profiles').update({ role, specialization: cleanSpecialization }).eq('id', user_id)
    return error ? json({ error: 'Unable to update role' }, 400) : json({ success: true })
  } catch { return json({ error: 'Unauthorized' }, 401) }
})
