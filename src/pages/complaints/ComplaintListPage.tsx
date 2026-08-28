import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { complaintService } from '../../services/complaintService'
import type { Complaint } from '../../types'
import { EmptyState, LoadingScreen } from '../../components/common/States'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'

export function ComplaintListPage(){
  const{profile}=useAuth()
  const nav=useNavigate()
  const[items,setItems]=useState<Complaint[]>([])
  const[q,setQ]=useState('')
  const[status,setStatus]=useState('')
  const[loading,setLoading]=useState(true)
  const[loadError,setLoadError]=useState('')

  useEffect(()=>{
    complaintService.list().then(({data,error})=>{
      if(error){console.error('Complaint list failed',error);setLoadError(`Unable to load complaints (code: ${error.code||'unknown'}).`)}
      setItems((data||[]) as unknown as Complaint[])
      setLoading(false)
    })
  },[])

  const shown=items.filter(item=>{
    const reporter=item.reporter
    const searchable=`${item.title} ${item.complaint_number} ${item.other_category||''} ${reporter?.full_name||''} ${reporter?.student_id||''}`.toLowerCase()
    return(!status||item.status===status)&&searchable.includes(q.toLowerCase())
  })
  if(loading)return <LoadingScreen/>

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="display text-4xl">Complaints</h1><p className="mt-2 text-slate-500">Search, review, and track facility reports.</p></div>{profile?.role==='student'&&<Link className="btn-primary" to="/student/complaints/new">New complaint</Link>}</div>
    {loadError&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError} Check the account role and complaint RLS policies.</div>}
    <div className="my-6 flex flex-wrap items-center gap-3"><label className="relative min-w-[260px] flex-1"><span className="sr-only">Search complaints</span><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" placeholder="Search report, name, or School ID" value={q} onChange={e=>setQ(e.target.value)}/></label><label><span className="sr-only">Filter by status</span><select className="input w-auto min-w-44" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['submitted','under_review','verified','assigned','in_progress','waiting_for_materials','resolved','closed','rejected','reopened'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>{(q||status)&&<button className="btn-secondary" type="button" onClick={()=>{setQ('');setStatus('')}}><X size={17}/>Clear</button>}<span className="text-sm text-slate-500" aria-live="polite">{shown.length} {shown.length===1?'result':'results'}</span></div>
    {shown.length===0?<EmptyState title="No matching complaints" message="No saved complaint matches the current search or filter."/>:<div className="card overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">Report</th><th>Reported by</th><th>Location</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead><tbody>{shown.map(item=>{
      const reporter=item.reporter
      const isTeacher=reporter?.account_type==='teacher'
      return <tr key={item.id} tabIndex={0} role="link" onClick={()=>nav(`/${profile?.role}/complaints/${item.id}`)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();nav(`/${profile?.role}/complaints/${item.id}`)}}} className="cursor-pointer border-b transition last:border-0 hover:bg-forest-50/60 focus:bg-forest-50">
        <td className="px-5 py-4"><span className="font-semibold hover:text-forest-700">{item.title}</span><small className="block text-slate-400">{item.complaint_number}</small></td>
        <td><b className="block text-sm">{reporter?.full_name||'Unknown user'}</b><small className="text-slate-400">{isTeacher?'Teacher / School Staff':`Student · ${reporter?.student_id||'No School ID'}`}</small></td>
        <td className="text-slate-500">{item.location?.building||'—'} {item.location?.room}</td><td><PriorityBadge priority={item.priority}/></td><td><StatusBadge status={item.status}/></td><td className="text-slate-500">{formatDate(item.submitted_at)}</td>
      </tr>})}</tbody></table></div>}
  </div>
}
