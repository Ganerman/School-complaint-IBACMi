import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingScreen } from '../components/common/States'
export function PortalRedirect(){const{profile,loading,user}=useAuth();if(loading)return <LoadingScreen/>;if(!user)return <Navigate to="/login" replace/>;return <Navigate to={profile?`/${profile.role}/dashboard`:'/login'} replace/>}
