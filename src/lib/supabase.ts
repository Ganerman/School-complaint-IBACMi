import { createClient } from '@supabase/supabase-js'

// These public client credentials are intentionally safe to ship in a browser.
// Environment variables can override them for another deployment. Database
// authorization remains enforced by Supabase Auth and Row Level Security.
const publicProjectUrl = 'https://sdxnryuueskhzzxrtjnz.supabase.co'
const publicPublishableKey = 'sb_publishable_kHVSEFJRikbD_pI6qmIbgg_4bCCAvcF'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || publicProjectUrl
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || publicPublishableKey

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
