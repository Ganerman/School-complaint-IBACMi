import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { PublicLayout } from './layouts/PublicLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoadingScreen } from './components/common/States'

const LandingPage=lazy(()=>import('./pages/public/LandingPage').then(m=>({default:m.LandingPage})))
const InfoPages=()=>import('./pages/public/InfoPages')
const AboutPage=lazy(()=>InfoPages().then(m=>({default:m.AboutPage})))
const VisionMissionPage=lazy(()=>InfoPages().then(m=>({default:m.VisionMissionPage})))
const AuthPages=()=>import('./pages/auth/AuthPages')
const LoginPage=lazy(()=>AuthPages().then(m=>({default:m.LoginPage})))
const RegisterPage=lazy(()=>AuthPages().then(m=>({default:m.RegisterPage})))
const ForgotPasswordPage=lazy(()=>AuthPages().then(m=>({default:m.ForgotPasswordPage})))
const ResetPasswordPage=lazy(()=>AuthPages().then(m=>({default:m.ResetPasswordPage})))
const PortalRedirect=lazy(()=>import('./pages/PortalRedirect').then(m=>({default:m.PortalRedirect})))
const DashboardPage=lazy(()=>import('./pages/dashboard/DashboardPage').then(m=>({default:m.DashboardPage})))
const ComplaintListPage=lazy(()=>import('./pages/complaints/ComplaintListPage').then(m=>({default:m.ComplaintListPage})))
const NewComplaintPage=lazy(()=>import('./pages/complaints/NewComplaintPage').then(m=>({default:m.NewComplaintPage})))
const ComplaintDetailPage=lazy(()=>import('./pages/complaints/ComplaintDetailPage').then(m=>({default:m.ComplaintDetailPage})))
const NotificationsPage=lazy(()=>import('./pages/notifications/NotificationsPage').then(m=>({default:m.NotificationsPage})))
const ProfilePage=lazy(()=>import('./pages/profile/ProfilePage').then(m=>({default:m.ProfilePage})))
const AdminPages=()=>import('./pages/admin/AdminPages')
const ReportsPage=lazy(()=>AdminPages().then(m=>({default:m.ReportsPage})))
const SettingsPage=lazy(()=>AdminPages().then(m=>({default:m.SettingsPage})))
const UsersPage=lazy(()=>import('./pages/admin/UsersPage').then(m=>({default:m.UsersPage})))
const AcademicPages=()=>import('./pages/academic/AcademicConcernPages')
const AcademicConcernListPage=lazy(()=>AcademicPages().then(m=>({default:m.AcademicConcernListPage})))
const NewAcademicConcernPage=lazy(()=>AcademicPages().then(m=>({default:m.NewAcademicConcernPage})))
const AcademicConcernDetailPage=lazy(()=>AcademicPages().then(m=>({default:m.AcademicConcernDetailPage})))

const shared = <>
  <Route path="dashboard" element={<DashboardPage/>}/>
  <Route path="complaints" element={<ComplaintListPage/>}/>
  <Route path="complaints/:id" element={<ComplaintDetailPage/>}/>
  <Route path="notifications" element={<NotificationsPage/>}/>
  <Route path="profile" element={<ProfilePage/>}/>
</>
export default function App(){return <BrowserRouter><AuthProvider><Suspense fallback={<LoadingScreen/>}><Routes>
  <Route element={<PublicLayout/>}><Route index element={<LandingPage/>}/><Route path="about" element={<AboutPage/>}/><Route path="vision-mission" element={<VisionMissionPage/>}/></Route>
  <Route path="login" element={<LoginPage/>}/><Route path="register" element={<RegisterPage/>}/><Route path="forgot-password" element={<ForgotPasswordPage/>}/><Route path="reset-password" element={<ResetPasswordPage/>}/><Route path="portal" element={<PortalRedirect/>}/>
  <Route element={<ProtectedRoute roles={['student']}/> }><Route path="student" element={<DashboardLayout/>}>{shared}<Route path="complaints/new" element={<NewComplaintPage/>}/><Route path="academic-concerns" element={<AcademicConcernListPage/>}/><Route path="academic-concerns/new" element={<NewAcademicConcernPage/>}/><Route path="academic-concerns/:id" element={<AcademicConcernDetailPage/>}/><Route index element={<Navigate to="dashboard" replace/>}/></Route></Route>
  <Route element={<ProtectedRoute roles={['maintenance']}/> }><Route path="maintenance" element={<DashboardLayout/>}>{shared}<Route index element={<Navigate to="dashboard" replace/>}/></Route></Route>
  <Route element={<ProtectedRoute roles={['admin']}/> }><Route path="admin" element={<DashboardLayout/>}>{shared}<Route path="users" element={<UsersPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="academic-concerns" element={<AcademicConcernListPage/>}/><Route path="academic-concerns/:id" element={<AcademicConcernDetailPage/>}/><Route index element={<Navigate to="dashboard" replace/>}/></Route></Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes></Suspense><Toaster richColors position="top-right"/></AuthProvider></BrowserRouter>}
