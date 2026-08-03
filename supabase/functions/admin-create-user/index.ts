import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin.ts'
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const { adminClient } = await requireAdmin(req)
    const body = await req.json()
    if (!body.email || !body.full_name || !body.school_id || !['student','maintenance'].includes(body.role)) return json({ error: 'Email, full name, School ID, and role are required' }, 400)
    const password = crypto.randomUUID() + 'Aa1!'
    const { data, error } = await adminClient.auth.admin.createUser({ email: body.email, password, email_confirm: true, user_metadata: { full_name: body.full_name, student_id: String(body.school_id).trim() } })
    if (error) return json({ error: 'Unable to create user' }, 400)
    const { error: profileError } = await adminClient.from('profiles').update({ student_id: String(body.school_id).trim(), role: body.role, specialization: body.specialization || null, must_change_password: true }).eq('id', data.user.id)
    if (profileError) { await adminClient.auth.admin.deleteUser(data.user.id); return json({ error: 'School ID is already in use' }, 409) }
    const { error: inviteError } = await adminClient.auth.resetPasswordForEmail(body.email)
    return json({ success: true, user_id: data.user.id, invitation_sent: !inviteError })
  } catch (e) { return json({ error: e instanceof Error && e.message === 'FORBIDDEN' ? 'Forbidden' : 'Unauthorized' }, 401) }
})
