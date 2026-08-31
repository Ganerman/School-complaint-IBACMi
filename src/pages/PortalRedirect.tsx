import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingScreen } from '../components/common/States'
export function PortalRedirect(){const{profile,loading,user}=useAuth();if(loading)return <LoadingScreen/>;if(!user)return <Navigate to="/login" replace/>;const incomplete=profile?.role==='student'&&!(profile.full_name?.trim()&&profile.student_id?.trim()&&profile.course?.trim()&&profile.year_level?.trim()&&profile.contact_number?.trim());return <Navigate to={profile?(incomplete?'/student/complete-profile':`/${profile.role}/dashboard`):'/login'} replace/>}
