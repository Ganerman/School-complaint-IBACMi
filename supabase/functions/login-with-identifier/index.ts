import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await request.json()
    const identifier = String(body.identifier || '').trim()
    const password = String(body.password || '')
    if (!identifier || !password || identifier.length > 100 || password.length > 200) {
      return json({ error: 'Invalid School ID or password.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('email,account_status')
      .ilike('student_id', identifier)
      .maybeSingle()

    if (!profile?.email || profile.account_status !== 'active') {
      return json({ error: 'Invalid School ID or password.' }, 401)
    }

    const authClient = createClient(url, anonKey, { auth: { persistSession: false } })
    const { data, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (error || !data.session) {
      return json({ error: 'Invalid School ID or password.' }, 401)
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch {
    return json({ error: 'Unable to sign in right now.' }, 500)
  }
})
