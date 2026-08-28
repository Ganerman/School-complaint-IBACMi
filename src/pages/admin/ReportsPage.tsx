import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, CircleGauge, Clock3, Download, FilterX, GraduationCap, MessageSquareText, TrendingUp, Wrench } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import type { AcademicConcern, Complaint } from '../../types'
import { humanize } from '../../utils/format'

const statuses = ['submitted','under_review','verified','assigned','in_progress','waiting_for_materials','resolved','closed','rejected','reopened']
const closedStatuses = ['resolved','closed','rejected']
const chartColors = ['#800000','#fec633','#16a34a','#2563eb','#7c3aed','#ea580c','#64748b']
const emptyFilters = { from:'', to:'', status:'', category:'', location:'' }
const complaintCategoryLabel = (item:Complaint) => item.category?.name==='Other'&&item.other_category ? `Other: ${item.other_category}` : item.category?.name||'Uncategorized'

export function ReportsPage(){
  const [items,setItems]=useState<Complaint[]>([])
  const [academicItems,setAcademicItems]=useState<AcademicConcern[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [filters,setFilters]=useState(emptyFilters)

  const load=useCallback(async()=>{
    const [complaints,academic]=await Promise.all([
      supabase.from('complaints').select('*,category:complaint_categories(*),location:locations(*)').order('submitted_at',{ascending:false}),
      supabase.from('academic_concerns').select('*').order('created_at',{ascending:false}),
    ])
    setError(complaints.error||academic.error?'Analytics could not be loaded completely. Please try again.':'')
    setItems((complaints.data||[]) as Complaint[])
    setAcademicItems((academic.data||[]) as AcademicConcern[])
    setLoading(false)
  },[])

  useEffect(()=>{void load()},[load])
  useRealtime('complaints',load)
  useRealtime('academic_concerns',load)

  const categories=useMemo(()=>[...new Set(items.map(item=>item.category?.name).filter(Boolean) as string[])].sort(),[items])
  const locations=useMemo(()=>[...new Set(items.map(item=>item.location?.building).filter(Boolean) as string[])].sort(),[items])
  const shown=useMemo(()=>items.filter(item=>(!filters.from||item.submitted_at.slice(0,10)>=filters.from)&&(!filters.to||item.submitted_at.slice(0,10)<=filters.to)&&(!filters.status||item.status===filters.status)&&(!filters.category||item.category?.name===filters.category)&&(!filters.location||item.location?.building===filters.location)),[items,filters])
  const academicShown=useMemo(()=>academicItems.filter(item=>(!filters.from||item.created_at.slice(0,10)>=filters.from)&&(!filters.to||item.created_at.slice(0,10)<=filters.to)),[academicItems,filters.from,filters.to])
  const resolved=shown.filter(item=>item.resolved_at)
  const open=shown.filter(item=>!closedStatuses.includes(item.status))
  const overdue=open.filter(item=>new Date(item.sla_deadline)<new Date())
  const slaMet=resolved.filter(item=>new Date(item.resolved_at!)<=new Date(item.sla_deadline)).length
  const averageHours=resolved.length?Math.round(resolved.reduce((sum,item)=>sum+(new Date(item.resolved_at!).getTime()-new Date(item.submitted_at).getTime())/36e5,0)/resolved.length):0
  const resolutionRate=shown.length?Math.round(resolved.length/shown.length*100):0
  const slaRate=resolved.length?Math.round(slaMet/resolved.length*100):0
  const urgentOpen=open.filter(item=>item.priority==='high'||item.priority==='emergency').length
  const unassigned=open.filter(item=>!item.assigned_staff_id).length
  const activeFilterCount=Object.values(filters).filter(Boolean).length
  const academicClosed=academicShown.filter(item=>['resolved','dismissed','escalated'].includes(item.status))
  const academicActive=academicShown.filter(item=>!['resolved','dismissed','escalated'].includes(item.status))
  const academicAwaiting=academicShown.filter(item=>['under_review','teacher_notified'].includes(item.status)).length
  const academicMeetings=academicShown.filter(item=>item.status==='meeting_scheduled').length
  const academicResolutionRate=academicShown.length?Math.round(academicClosed.length/academicShown.length*100):0

  const categoryData=useMemo(()=>Object.entries(shown.reduce<Record<string,number>>((result,item)=>{const key=complaintCategoryLabel(item);result[key]=(result[key]||0)+1;return result},{})).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,8),[shown])
  const statusData=useMemo(()=>Object.entries(shown.reduce<Record<string,number>>((result,item)=>{result[item.status]=(result[item.status]||0)+1;return result},{})).map(([name,value])=>({name:humanize(name),value})).sort((a,b)=>b.value-a.value),[shown])
  const priorityData=useMemo(()=>['emergency','high','medium','low'].map(name=>({name:humanize(name),total:shown.filter(item=>item.priority===name).length})),[shown])
  const buildingData=useMemo(()=>Object.entries(shown.reduce<Record<string,number>>((result,item)=>{const key=item.location?.building||'Unspecified';result[key]=(result[key]||0)+1;return result},{})).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total),[shown])
  const academicTypeData=useMemo(()=>Object.entries(academicShown.reduce<Record<string,number>>((result,item)=>{result[item.concern_type]=(result[item.concern_type]||0)+1;return result},{})).map(([name,total])=>({name:humanize(name),total})).sort((a,b)=>b.total-a.total),[academicShown])
  const academicStatusData=useMemo(()=>Object.entries(academicShown.reduce<Record<string,number>>((result,item)=>{result[item.status]=(result[item.status]||0)+1;return result},{})).map(([name,value])=>({name:humanize(name),value})).sort((a,b)=>b.value-a.value),[academicShown])
  const trendData=useMemo(()=>{
    if(!shown.length)return[]
    const timestamps=shown.map(item=>new Date(item.submitted_at).getTime())
    const monthly=(Math.max(...timestamps)-Math.min(...timestamps))/864e5>45
    const buckets=new Map<string,{key:string;label:string;submitted:number;resolved:number}>()
    const identity=(iso:string)=>{const date=new Date(iso);const key=monthly?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`:date.toISOString().slice(0,10);const label=monthly?date.toLocaleDateString('en-US',{month:'short',year:'2-digit'}):date.toLocaleDateString('en-US',{month:'short',day:'numeric'});return{key,label}}
    shown.forEach(item=>{
      const submitted=identity(item.submitted_at)
      const submittedBucket=buckets.get(submitted.key)||{...submitted,submitted:0,resolved:0}
      submittedBucket.submitted+=1
      buckets.set(submitted.key,submittedBucket)
      if(item.resolved_at){const complete=identity(item.resolved_at);const resolvedBucket=buckets.get(complete.key)||{...complete,submitted:0,resolved:0};resolvedBucket.resolved+=1;buckets.set(complete.key,resolvedBucket)}
    })
    return [...buckets.values()].sort((a,b)=>a.key.localeCompare(b.key)).slice(-12)
  },[shown])

  function exportCsv(){
    const safe=(value:unknown)=>{let text=String(value??'');if(/^[=+\-@]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`}
    const rows=[['Number','Title','Status','Priority','Category','Building','Submitted','SLA deadline','Resolved'],...shown.map(item=>[item.complaint_number,item.title,item.status,item.priority,complaintCategoryLabel(item),item.location?.building||'',item.submitted_at,item.sla_deadline,item.resolved_at||''])]
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\n')],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const anchor=document.createElement('a')
    anchor.href=url
    anchor.download=`complaint-report-${new Date().toISOString().slice(0,10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">Operations intelligence</p><h1 className="display mt-1 text-4xl">Analytics & SLA</h1><p className="mt-2 text-slate-500">Monitor complaint volume, response performance, and operational risk.</p></div>
      <button className="btn-primary" onClick={exportCsv} disabled={!shown.length}><Download size={18}/>Export {shown.length} records</button>
    </div>

    <section className="card mt-7 p-4" aria-label="Analytics filters">
      <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Filter analytics</h2><p className="text-xs text-slate-400">Every metric and chart updates together.</p></div>{activeFilterCount>0&&<button className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700" onClick={()=>setFilters(emptyFilters)}><FilterX size={15}/>Clear {activeFilterCount} filter{activeFilterCount>1?'s':''}</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Filter label="From"><input className="input" type="date" value={filters.from} max={filters.to||undefined} onChange={event=>setFilters({...filters,from:event.target.value})}/></Filter>
        <Filter label="To"><input className="input" type="date" value={filters.to} min={filters.from||undefined} onChange={event=>setFilters({...filters,to:event.target.value})}/></Filter>
        <Filter label="Status"><select className="input" value={filters.status} onChange={event=>setFilters({...filters,status:event.target.value})}><option value="">All statuses</option>{statuses.map(status=><option key={status} value={status}>{humanize(status)}</option>)}</select></Filter>
        <Filter label="Category"><select className="input" value={filters.category} onChange={event=>setFilters({...filters,category:event.target.value})}><option value="">All categories</option>{categories.map(category=><option key={category}>{category}</option>)}</select></Filter>
        <Filter label="Building"><select className="input" value={filters.location} onChange={event=>setFilters({...filters,location:event.target.value})}><option value="">All buildings</option>{locations.map(location=><option key={location}>{location}</option>)}</select></Filter>
      </div>
    </section>

    {error&&<p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total complaints" value={loading?'…':shown.length} detail={`${open.length} currently open`} icon={<BarChart3/>}/>
      <Metric label="Resolution rate" value={`${resolutionRate}%`} detail={`${resolved.length} completed cases`} icon={<CheckCircle2/>} tone="green"/>
      <Metric label="SLA compliance" value={`${slaRate}%`} detail={`${slaMet} of ${resolved.length} resolved on time`} icon={<CircleGauge/>} tone={slaRate<80?'amber':'green'}/>
      <Metric label="Average resolution" value={`${averageHours}h`} detail={`${overdue.length} currently overdue`} icon={<Clock3/>} tone={overdue.length?'red':'maroon'} danger={overdue.length>0}/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
      <ChartCard title="Complaint flow" subtitle="Submitted versus resolved cases over time"><div className="h-80" role="img" aria-label="Submitted and resolved complaint trend"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{top:12,right:12,left:-18}}><defs><linearGradient id="submittedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#800000" stopOpacity={.28}/><stop offset="95%" stopColor="#800000" stopOpacity={.02}/></linearGradient><linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={.22}/><stop offset="95%" stopColor="#16a34a" stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="label" tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Area type="monotone" dataKey="submitted" name="Submitted" stroke="#800000" strokeWidth={2.5} fill="url(#submittedFill)"/><Area type="monotone" dataKey="resolved" name="Resolved" stroke="#16a34a" strokeWidth={2.5} fill="url(#resolvedFill)"/></AreaChart></ResponsiveContainer></div></ChartCard>
      <ChartCard title="Status mix" subtitle="Distribution of the filtered workload">{statusData.length?<div className="h-80" role="img" aria-label="Complaint status distribution"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={2}>{statusData.map((_,index)=><Cell key={index} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip/><Legend iconType="circle" wrapperStyle={{fontSize:12}}/></PieChart></ResponsiveContainer></div>:<NoData/>}</ChartCard>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <ChartCard title="Top complaint categories" subtitle="Where reported issues are concentrated">{categoryData.length?<HorizontalBar data={categoryData}/>:<NoData/>}</ChartCard>
      <ChartCard title="Priority profile" subtitle="Severity of complaints in the selected view">{shown.length?<div className="h-72" role="img" aria-label="Complaint priority distribution"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityData} margin={{left:-10,right:12,top:8}}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="total" name="Complaints" radius={[7,7,0,0]}>{priorityData.map((_,index)=><Cell key={index} fill={['#dc2626','#ea580c','#fec633','#64748b'][index]}/>)}</Bar></BarChart></ResponsiveContainer></div>:<NoData/>}</ChartCard>
    </div>

    <section className="card mt-5 overflow-hidden"><div className="border-b bg-slate-50/70 px-5 py-4"><h2 className="font-bold">Operational focus</h2><p className="mt-1 text-sm text-slate-500">Immediate signals from the filtered complaint set.</p></div><div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4"><Insight icon={<AlertTriangle/>} label="Overdue cases" value={overdue.length} note="Past their SLA deadline" danger={overdue.length>0}/><Insight icon={<TrendingUp/>} label="Urgent open" value={urgentOpen} note="High or emergency priority" danger={urgentOpen>0}/><Insight icon={<Wrench/>} label="Needs assignment" value={unassigned} note="Open without maintenance staff" danger={unassigned>0}/><Insight icon={<BarChart3/>} label="Busiest building" value={buildingData[0]?.name||'—'} note={buildingData[0]?`${buildingData[0].total} complaint${buildingData[0].total===1?'':'s'}`:'No location data'}/></div></section>

    <section className="mt-10 border-t-2 border-forest-100 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">Confidential case overview</p><h2 className="display mt-1 text-3xl">Academic concern analytics</h2><p className="mt-2 text-sm text-slate-500">Aggregated workflow insights without exposing confidential case statements.</p></div><p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">Date filters apply to this section</p></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total concerns" value={loading?'…':academicShown.length} detail={`${academicActive.length} active cases`} icon={<GraduationCap/>}/>
        <Metric label="Completion rate" value={`${academicResolutionRate}%`} detail={`${academicClosed.length} completed or closed`} icon={<CheckCircle2/>} tone="green"/>
        <Metric label="Awaiting response" value={academicAwaiting} detail="Student or teacher action stage" icon={<MessageSquareText/>} tone={academicAwaiting?'amber':'green'}/>
        <Metric label="Meetings scheduled" value={academicMeetings} detail="Cases currently in meeting stage" icon={<CalendarClock/>} tone="maroon"/>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <ChartCard title="Concern types" subtitle="Most common academic support needs">{academicTypeData.length?<HorizontalBar data={academicTypeData} label="Academic concerns by type"/>:<NoData message="No academic concerns match the selected dates."/>}</ChartCard>
        <ChartCard title="Academic workflow status" subtitle="Current stage of every concern">{academicStatusData.length?<div className="h-72" role="img" aria-label="Academic concern status distribution"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={academicStatusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>{academicStatusData.map((_,index)=><Cell key={index} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip/><Legend iconType="circle" wrapperStyle={{fontSize:12}}/></PieChart></ResponsiveContainer></div>:<NoData message="No academic concerns match the selected dates."/>}</ChartCard>
      </div>
    </section>
  </div>
}

function Filter({label,children}:{label:string;children:ReactNode}){return <label><span className="label">{label}</span>{children}</label>}
function Metric({label,value,detail,icon,danger=false,tone='maroon'}:{label:string;value:string|number;detail:string;icon:ReactNode;danger?:boolean;tone?:'maroon'|'green'|'amber'|'red'}){const tones={maroon:'bg-forest-50 text-forest-700',green:'bg-green-50 text-green-700',amber:'bg-amber-50 text-amber-800',red:'bg-red-50 text-red-600'};return <div className="card p-5"><div className="flex items-center justify-between gap-3"><small className="font-semibold uppercase tracking-wider text-slate-400">{label}</small><span className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</span></div><p className={`mt-3 text-3xl font-bold tracking-tight ${danger?'text-red-600':'text-slate-900'}`}>{value}</p><small className={`mt-1 block ${danger?'font-medium text-red-500':'text-slate-400'}`}>{detail}</small></div>}
function ChartCard({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <section className="card min-w-0 p-5"><div className="mb-4"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{children}</section>}
function NoData({message='No complaints match the selected filters.'}:{message?:string}){return <div className="grid h-72 place-items-center rounded-xl border border-dashed bg-slate-50 px-4 text-center text-sm text-slate-500">{message}</div>}
function HorizontalBar({data,label='Complaints by category'}:{data:{name:string;total:number}[];label?:string}){return <div className="h-72" role="img" aria-label={label}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{left:12,right:20}}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false}/><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={125} tick={{fontSize:11,fill:'#475569'}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="total" name="Cases" fill="#800000" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>}
function Insight({icon,label,value,note,danger=false}:{icon:ReactNode;label:string;value:string|number;note:string;danger?:boolean}){return <div className="flex items-start gap-3 p-5"><span className={`rounded-xl p-2.5 ${danger?'bg-red-50 text-red-600':'bg-forest-50 text-forest-700'}`}>{icon}</span><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-xl font-bold ${danger?'text-red-600':'text-slate-900'}`}>{value}</p><p className="mt-0.5 text-xs text-slate-500">{note}</p></div></div>}
