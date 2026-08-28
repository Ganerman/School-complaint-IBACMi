import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Wrench } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { StatCard } from '../../components/dashboard/StatCard'
import { EmptyState, ErrorState, LoadingScreen } from '../../components/common/States'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import { complaintService } from '../../services/complaintService'
import type { Complaint } from '../../types'
import { formatDate, slaText } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'

export function DashboardPage(){
 const{profile}=useAuth();const nav=useNavigate();const[items,setItems]=useState<Complaint[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('')
 const load=useCallback(async()=>{const{data,error:loadError}=await complaintService.list();setError(loadError?'Unable to load the dashboard data. Please refresh and try again.':'');setItems((data||[]) as unknown as Complaint[]);setLoading(false)},[])
 useEffect(()=>{void load()},[load]);useRealtime('complaints',load)
 const stats=useMemo(()=>({total:items.length,active:items.filter(x=>['assigned','in_progress','waiting_for_materials'].includes(x.status)).length,resolved:items.filter(x=>['resolved','closed'].includes(x.status)).length,overdue:items.filter(x=>new Date(x.sla_deadline)<new Date()&&!['resolved','closed','rejected'].includes(x.status)).length}),[items])
 if(loading)return <LoadingScreen/>
 return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">{profile?.role} overview</p><h1 className="display mt-1 text-4xl text-slate-900">Dashboard</h1><p className="mt-2 text-slate-500">A live view of facility concerns and repair progress.</p></div>{profile?.role==='student'&&<Link className="btn-primary" to="/student/complaints/new">Submit a complaint</Link>}</div>
 {error&&<div className="mt-6"><ErrorState message={error}/></div>}
 <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={profile?.role==='maintenance'?'Assigned tasks':'Total complaints'} value={stats.total} icon={ClipboardList}/><StatCard label="Active work" value={stats.active} icon={Wrench} tone="gold"/><StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="green"/><StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="red"/></div>
 <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Recent complaints</h2><Link className="text-sm font-semibold text-forest-700" to={`/${profile?.role}/complaints`}>View all</Link></div>{items.length===0?<EmptyState title="No complaints yet" message="Complaint records you can access will appear here."/>:<div className="card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Complaint</th><th>Priority</th><th>Status</th><th>SLA</th><th>Submitted</th></tr></thead><tbody>{items.slice(0,7).map(x=><tr tabIndex={0} role="link" aria-label={`View full details for ${x.complaint_number}`} onClick={()=>nav(`/${profile?.role}/complaints/${x.id}`)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();nav(`/${profile?.role}/complaints/${x.id}`)}}} className="cursor-pointer border-b transition last:border-0 hover:bg-forest-50/60 focus:bg-forest-50" key={x.id}><td className="px-5 py-4"><span className="font-semibold text-slate-900 group-hover:text-forest-700">{x.title}</span><small className="mt-1 block text-slate-400">{x.complaint_number}</small></td><td><PriorityBadge priority={x.priority}/></td><td><StatusBadge status={x.status}/></td><td className={new Date(x.sla_deadline)<new Date()?'font-semibold text-red-600':'text-slate-500'}><span className="flex items-center gap-1.5"><Clock3 size={15}/>{slaText(x.sla_deadline,x.status)}</span></td><td className="text-slate-500">{formatDate(x.submitted_at)}</td></tr>)}</tbody></table></div>}</section></div>
}
