import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthState {
  user: User | null; session: Session | null; profile: Profile | null; loading: boolean
  refreshProfile: () => Promise<void>
}
export const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId?: string) => {
    const id = userId || session?.user.id
    if (!id) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    setProfile(data as Profile | null)
  }, [session?.user.id])

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) setTimeout(() => void loadProfile(next.user.id), 0)
      else setProfile(null)
      setLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  return <AuthContext.Provider value={{ user: session?.user ?? null, session, profile, loading, refreshProfile: () => loadProfile() }}>{children}</AuthContext.Provider>
}
