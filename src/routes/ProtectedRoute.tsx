import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingScreen } from '../components/common/States'
import type { UserRole } from '../types'

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <div className="grid min-h-screen place-items-center p-6 text-center">Your profile is unavailable. Please contact an administrator.</div>
  if (profile.account_status !== 'active') return <Navigate to="/login?inactive=1" replace />
  if (roles && !roles.includes(profile.role)) return <Navigate to={`/${profile.role}/dashboard`} replace />
  return <Outlet />
}
