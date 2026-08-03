import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin.ts'
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { adminClient } = await requireAdmin(req); const { user_id, title, message, complaint_id } = await req.json()
    if (!user_id || !title || !message) return json({ error: 'Missing notification fields' }, 400)
    const { error } = await adminClient.from('notifications').insert({ user_id, title: String(title).slice(0,150), message: String(message).slice(0,1000), notification_type: 'manual', reference_id: complaint_id || null })
    return error ? json({ error: 'Unable to send notification' }, 400) : json({ success: true })
  } catch { return json({ error: 'Unauthorized' }, 401) }
})
