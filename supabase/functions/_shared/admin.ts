import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function requireAdmin(request: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authorization = request.headers.get('Authorization') || ''
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) throw new Error('UNAUTHORIZED')
  const adminClient = createClient(url, service, { auth: { persistSession: false } })
  const { data: profile } = await adminClient.from('profiles').select('role,account_status').eq('id', user.id).single()
  if (profile?.role !== 'admin' || profile?.account_status !== 'active') throw new Error('FORBIDDEN')
  return { adminClient, user }
}
