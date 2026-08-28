import { useCallback, useEffect, useState } from 'react'
import { Bell, ChartNoAxesCombined, ClipboardList, FilePlus2, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, UserRound, Users, Wrench, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'
import { humanize } from '../utils/format'
import { notificationService } from '../services/notificationService'
import { useRealtime } from '../hooks/useRealtime'
import { BrandLogo } from '../components/common/BrandLogo'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { pushNotificationService } from '../services/pushNotificationService'

const menus = {
  student: [[LayoutDashboard,'Dashboard','dashboard'],[FilePlus2,'Facility complaint','complaints/new'],[ClipboardList,'My facility complaints','complaints'],[GraduationCap,'Academic concerns','academic-concerns'],[Bell,'Notifications','notifications'],[UserRound,'Profile','profile']],
  maintenance: [[LayoutDashboard,'Dashboard','dashboard'],[Wrench,'Assigned complaints','complaints'],[Bell,'Notifications','notifications'],[UserRound,'Profile','profile']],
  admin: [[LayoutDashboard,'Dashboard','dashboard'],[ClipboardList,'Facility complaints','complaints'],[GraduationCap,'Academic concerns','academic-concerns'],[Users,'Users & staff','users'],[ChartNoAxesCombined,'Reports & SLA','reports'],[Settings,'System setup','settings'],[Bell,'Notifications','notifications'],[UserRound,'Profile','profile']],
} as const

export function DashboardLayout() {
  const {profile}=useAuth();const[open,setOpen]=useState(false);const[unread,setUnread]=useState(0);const nav=useNavigate()
  const loadUnread=useCallback(async()=>{const{count,error}=await notificationService.unreadCount();if(!error)setUnread(count||0)},[])
  useEffect(()=>{if(profile)void loadUnread()},[profile,loadUnread])
  useEffect(()=>{if(profile)void pushNotificationService.syncExisting(profile.id).catch(()=>undefined)},[profile])
  useRealtime('notifications',loadUnread)
  useEffect(()=>{if(!profile)return;const channel=supabase.channel(`alerts-${profile.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${profile.id}`},payload=>{const notification=payload.new as {title?:string;message?:string;reference_id?:string;notification_type?:string};const section=notification.notification_type?.startsWith('academic_')?'academic-concerns':'complaints';void loadUnread();toast.info(notification.title||'New notification',{description:notification.message,action:notification.reference_id?{label:'Open',onClick:()=>nav(`/${profile.role}/${section}/${notification.reference_id}`)}:undefined,duration:10000})}).subscribe();return()=>{void supabase.removeChannel(channel)}},[profile,loadUnread,nav])
  if(!profile)return null
  const base=`/${profile.role}`
  async function logout(){await pushNotificationService.disable().catch(()=>undefined);await authService.signOut();nav('/login')}
  const side=<><div className="flex h-20 items-center justify-between px-5"><div className="flex items-center gap-3 text-white"><BrandLogo className="h-14 w-14"/><div><b className="block text-sm leading-4">School Facility Complaint</b><small className="block text-white/50">Monitoring System</small><small className="block text-[9px] text-white/35">IBA College of Mindanao, Inc.</small></div></div><button className="text-white lg:hidden" onClick={()=>setOpen(false)}><X/></button></div><div className="mx-5 mb-5 rounded-xl bg-white/10 p-3"><p className="truncate text-sm font-semibold text-white">{profile.full_name}</p><p className="mt-0.5 text-xs text-white/45">{humanize(profile.account_type)} portal</p></div><nav className="flex-1 space-y-1 px-3">{menus[profile.role].filter(([, ,path])=>profile.account_type!=='staff'||path!=='academic-concerns').map(([Icon,label,path])=><NavLink key={path} to={`${base}/${path}`} end={path==='complaints'} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive?'bg-amber-400 text-forest-900':'text-white/65 hover:bg-white/10 hover:text-white'}`}><Icon size={19}/>{label}</NavLink>)}</nav><button onClick={logout} className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10"><LogOut size={19}/>Sign out</button></>
  return <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r-4 border-amber-400 bg-forest-900 lg:flex">{side}</aside>{open&&<><div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={()=>setOpen(false)}/><aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r-4 border-amber-400 bg-forest-900 lg:hidden">{side}</aside></>}<div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b-2 border-forest-600 bg-white/90 px-5 backdrop-blur md:px-8"><button className="lg:hidden" onClick={()=>setOpen(true)}><Menu/></button><div className="hidden md:block"><p className="text-xs font-semibold uppercase tracking-wider text-forest-600">School Facility System</p><p className="font-semibold">Good day, {profile.full_name.split(' ')[0]}</p></div><div className="flex items-center gap-3"><NavLink to={`${base}/notifications`} aria-label={unread?`${unread} unread notifications`:'Notifications'} className="relative rounded-xl border p-2.5 text-slate-500"><Bell size={20}/>{unread>0&&<span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread>99?'99+':unread}</span>}</NavLink><NavLink to={`${base}/profile`} aria-label="Open profile">{profile.avatar_url?<img src={profile.avatar_url} alt="Profile" className="h-10 w-10 rounded-full border object-cover"/>:<span className="grid h-10 w-10 place-items-center rounded-full bg-forest-100 font-bold text-forest-700">{profile.full_name.slice(0,1).toUpperCase()}</span>}</NavLink></div></header><main className="mx-auto max-w-[1500px] p-5 md:p-8"><Outlet/></main></div></div>
}
