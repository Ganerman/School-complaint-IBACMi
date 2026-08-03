import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin.ts'
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { adminClient } = await requireAdmin(req); const filters = await req.json()
    let query = adminClient.from('complaints').select('complaint_number,title,status,priority,submitted_at,resolved_at,category:complaint_categories(name),location:locations(building,floor,room)')
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.date_from) query = query.gte('submitted_at', filters.date_from)
    if (filters.date_to) query = query.lte('submitted_at', filters.date_to)
    const { data, error } = await query.order('submitted_at', { ascending: false }).limit(10000)
    return error ? json({ error: 'Unable to generate report' }, 400) : json({ success: true, generated_at: new Date().toISOString(), rows: data })
  } catch { return json({ error: 'Unauthorized' }, 401) }
})
