import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingScreen } from '../components/common/States'
import type { UserRole } from '../types'
import { authService } from '../services/authService'

export function ProtectedRoute({ roles, requireCompleteProfile }: { roles?: UserRole[]; requireCompleteProfile?: boolean }) {
  const { user, profile, loading } = useAuth()
  const routeLocation = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <div className="grid min-h-screen place-items-center p-6 text-center">Your profile is unavailable. Please contact an administrator.</div>
  if (profile.account_status !== 'active') return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="card max-w-lg p-8 text-center"><h1 className="display text-3xl">{profile.verification_status==='pending'?'Account awaiting approval':'Account unavailable'}</h1><p className="mt-3 text-slate-600">{profile.verification_status==='pending'?'Your teacher or staff identity must be verified by an administrator before you can use the portal.':'Your registration was not approved. Please contact the school office if you believe this is an error.'}</p><button className="btn-secondary mt-6" onClick={async()=>{await authService.signOut();globalThis.location.assign('/login')}}>Sign out</button></div></div>
  if (roles && !roles.includes(profile.role)) return <Navigate to={`/${profile.role}/dashboard`} replace />
  const complete = Boolean(profile.full_name?.trim() && profile.student_id?.trim() && profile.course?.trim() && profile.year_level?.trim() && profile.contact_number?.trim())
  if (requireCompleteProfile && profile.role === 'student' && !complete && !routeLocation.pathname.endsWith('/complete-profile')) return <Navigate to="/student/complete-profile" replace />
  return <Outlet />
}
