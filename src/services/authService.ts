import { supabase } from '../lib/supabase'

export const authService = {
  signIn: async (identifier: string, password: string) => {
    const value = identifier.trim()
    if (value.includes('@')) return supabase.auth.signInWithPassword({ email: value, password })

    const { data, error } = await supabase.functions.invoke('login-with-identifier', {
      body: { identifier: value, password },
    })
    if (error) {
      const response = (error as { context?: Response }).context
      const message = response?.status === 404
        ? 'School ID login is not deployed yet.'
        : response?.status === 401
          ? 'Invalid School ID or password.'
          : 'School ID login service is unavailable.'
      return { data: { user: null, session: null }, error: new Error(message) }
    }
    if (!data?.access_token || !data?.refresh_token) {
      return {
        data: { user: null, session: null },
        error: new Error(data?.error || 'Invalid School ID or password.'),
      }
    }
    return supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
  },
  signInWithGoogle: async () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/portal`,
        queryParams: { prompt: 'select_account' },
      },
    }),
  signUp: async (data: { email: string; password: string; fullName: string; studentId: string; course: string; yearLevel: string; department: string; accountType: 'student'|'teacher'|'staff' }) =>
    supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name:data.fullName.trim(), student_id:data.studentId.trim(), course:data.accountType==='student'?data.course:'', year_level:data.accountType==='student'?data.yearLevel:'', department:data.accountType==='student'?'':data.department.trim(), account_type:data.accountType },
      },
    }),
  signOut: async () => supabase.auth.signOut(),
  resetPassword: async (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
  updatePassword: async (password: string) => supabase.auth.updateUser({ password }),
}
