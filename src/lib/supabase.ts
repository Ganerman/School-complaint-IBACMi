import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  console.info('Supabase is not configured. Copy .env.example to .env and add your project credentials.')
}

// A harmless placeholder lets the public landing page render before environment setup.
// Data and authentication calls remain disabled by isSupabaseConfigured guards.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-publishable-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
