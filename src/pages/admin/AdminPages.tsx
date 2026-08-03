import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, Clock3, Download, Pencil, Plus, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import type { Complaint, ComplaintCategory, Location, Profile } from '../../types'
import { humanize } from '../../utils/format'
export function UsersPage(){const[users,setUsers]=useState<Profile[]>([]);useEffect(()=>{void supabase.from('profiles').select('*').order('created_at',{ascending:false}).then(({data})=>setUsers((data||[]) as Profile[]))},[]);return <div><h1 className="display text-4xl">Users & staff</h1><p className="mt-2 text-slate-500">Account creation and role changes use secured administrator Edge Functions.</p><div className="card mt-7 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">Name</th><th>Role</th><th>Identifier</th><th>Status</th></tr></thead><tbody>{users.map(u=><tr className="border-b" key={u.id}><td className="px-5 py-4"><b>{u.full_name}</b><small className="block text-slate-400">{u.email}</small></td><td>{humanize(u.role)}</td><td>{u.student_id||u.specialization||'—'}</td><td>{humanize(u.account_status)}</td></tr>)}</tbody></table></div></div>}
export function ReportsPage(){
  const[items,setItems]=useState<Complaint[]>([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[filters,setFilters]=useState({from:'',to:'',status:'',category:'',location:''})
  useEffect(()=>{void supabase.from('complaints').select('*,category:complaint_categories(*),location:locations(*)').order('submitted_at',{ascending:false}).then(({data,error})=>{if(error)setError('Reports could not be loaded. Please try again.');setItems((data||[]) as Complaint[]);setLoading(false)})},[])
  const categories=useMemo(()=>[...new Set(items.map(x=>x.category?.name).filter(Boolean) as string[])].sort(),[items])
  const locations=useMemo(()=>[...new Set(items.map(x=>x.location?.building).filter(Boolean) as string[])].sort(),[items])
  const shown=useMemo(()=>items.filter(x=>(!filters.from||x.submitted_at.slice(0,10)>=filters.from)&&(!filters.to||x.submitted_at.slice(0,10)<=filters.to)&&(!filters.status||x.status===filters.status)&&(!filters.category||x.category?.name===filters.category)&&(!filters.location||x.location?.building===filters.location)),[items,filters])
  const resolved=shown.filter(x=>x.resolved_at)
  const overdue=shown.filter(x=>new Date(x.sla_deadline)<new Date()&&!['resolved','closed','rejected'].includes(x.status)).length
  const slaMet=resolved.filter(x=>new Date(x.resolved_at!)<=new Date(x.sla_deadline)).length
  const averageHours=resolved.length?Math.round(resolved.reduce((sum,x)=>sum+(new Date(x.resolved_at!).getTime()-new Date(x.submitted_at).getTime())/36e5,0)/resolved.length):0
  const categoryData=useMemo(()=>Object.entries(shown.reduce<Record<string,number>>((a,x)=>{const key=x.category?.name||'Uncategorized';a[key]=(a[key]||0)+1;return a},{})).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,8),[shown])
  function csv(){
    const safe=(value:unknown)=>{let text=String(value??'');if(/^[=+\-@]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`}
    const rows=[['Number','Title','Status','Priority','Category','Building','Submitted','SLA deadline','Resolved'],...shown.map(x=>[x.complaint_number,x.title,x.status,x.priority,x.category?.name||'',x.location?.building||'',x.submitted_at,x.sla_deadline,x.resolved_at||''])]
    const blob=new Blob(['\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\n')],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`complaint-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="display text-4xl">Reports & SLA</h1><p className="mt-2 text-slate-500">Analyze performance and export the currently filtered records.</p></div><button className="btn-primary" onClick={csv} disabled={!shown.length}><Download size={18}/>Export {shown.length} records</button></div>
    <section className="card mt-7 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Report filters"><label><span className="label">From</span><input className="input" type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label><label><span className="label">To</span><input className="input" type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label><label><span className="label">Status</span><select className="input" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All statuses</option>{['submitted','under_review','verified','assigned','in_progress','waiting_for_materials','resolved','closed','rejected','reopened'].map(x=><option key={x} value={x}>{humanize(x)}</option>)}</select></label><label><span className="label">Category</span><select className="input" value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})}><option value="">All categories</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label><span className="label">Building</span><select className="input" value={filters.location} onChange={e=>setFilters({...filters,location:e.target.value})}><option value="">All buildings</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label></section>
    {error&&<p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total reports" value={loading?'…':shown.length} icon={<BarChart3/>}/><Metric label="Resolution rate" value={`${shown.length?Math.round(resolved.length/shown.length*100):0}%`} icon={<CheckCircle2/>}/><Metric label="SLA compliance" value={`${resolved.length?Math.round(slaMet/resolved.length*100):0}%`} icon={<Clock3/>}/><Metric label="Average resolution" value={`${averageHours}h`} detail={`${overdue} currently overdue`} danger={overdue>0} icon={<Clock3/>}/></div>
    <section className="card mt-5 p-5"><div className="mb-5"><h2 className="font-bold">Complaints by category</h2><p className="text-sm text-slate-500">Top categories in the selected period</p></div>{categoryData.length?<div className="h-72" role="img" aria-label="Bar chart showing complaints by category"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} margin={{left:0,right:12}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:12}} interval={0} angle={-15} textAnchor="end" height={60}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="total" name="Complaints" fill="#166534" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>:<p className="py-16 text-center text-sm text-slate-500">No complaints match the selected filters.</p>}</section>
  </div>
}

function Metric({label,value,detail,icon,danger=false}:{label:string;value:string|number;detail?:string;icon:React.ReactNode;danger?:boolean}){return <div className="card p-5"><div className="flex items-center justify-between"><small className="font-medium text-slate-500">{label}</small><span className="text-forest-700">{icon}</span></div><p className={`mt-2 text-3xl font-bold ${danger?'text-red-600':''}`}>{value}</p>{detail&&<small className={danger?'text-red-500':'text-slate-400'}>{detail}</small>}</div>}
type LocationForm = { building: string; floor: string; room: string; location_description: string; is_active: boolean }
const emptyLocation: LocationForm = { building: '', floor: '', room: '', location_description: '', is_active: true }

export function SettingsPage(){
  const[cats,setCats]=useState<ComplaintCategory[]>([])
  const[locations,setLocations]=useState<Location[]>([])
  const[name,setName]=useState('')
  const[locationForm,setLocationForm]=useState<LocationForm>(emptyLocation)
  const[editingLocationId,setEditingLocationId]=useState<string|null>(null)
  const[showLocationForm,setShowLocationForm]=useState(false)
  const[savingLocation,setSavingLocation]=useState(false)

  async function load(){
    const[c,l]=await Promise.all([
      supabase.from('complaint_categories').select('*').order('name'),
      supabase.from('locations').select('*').order('building').order('floor').order('room'),
    ])
    setCats((c.data||[]) as ComplaintCategory[])
    setLocations((l.data||[]) as Location[])
  }
  useEffect(()=>{void load()},[])

  async function add(){
    if(!name.trim())return
    const{error}=await supabase.from('complaint_categories').insert({name:name.trim()})
    if(error)toast.error('Could not add category.')
    else toast.success('Category added.')
    if(!error)setName('')
    void load()
  }

  function openNewLocation(){
    setEditingLocationId(null)
    setLocationForm(emptyLocation)
    setShowLocationForm(true)
  }

  function openEditLocation(location:Location){
    setEditingLocationId(location.id)
    setLocationForm({
      building:location.building,
      floor:location.floor||'',
      room:location.room||'',
      location_description:location.location_description||'',
      is_active:location.is_active,
    })
    setShowLocationForm(true)
  }

  function closeLocationForm(){
    setShowLocationForm(false)
    setEditingLocationId(null)
    setLocationForm(emptyLocation)
  }

  async function saveLocation(e:React.FormEvent){
    e.preventDefault()
    if(!locationForm.building.trim())return toast.error('Building name is required.')
    setSavingLocation(true)
    const values={
      building:locationForm.building.trim(),
      floor:locationForm.floor.trim()||null,
      room:locationForm.room.trim()||null,
      location_description:locationForm.location_description.trim()||null,
      is_active:locationForm.is_active,
    }
    const result=editingLocationId
      ?await supabase.from('locations').update(values).eq('id',editingLocationId)
      :await supabase.from('locations').insert(values)
    setSavingLocation(false)
    if(result.error){
      const duplicate=result.error.code==='23505'
      return toast.error(duplicate?'That building, floor, and room already exists.':'Could not save location.')
    }
    toast.success(editingLocationId?'Location updated.':'Location added.')
    closeLocationForm()
    await load()
  }

  return <div>
    <h1 className="display text-4xl">System setup</h1>
    <p className="mt-2 text-slate-500">Manage complaint categories and campus locations.</p>
    <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="font-bold">Categories</h2>
        <div className="mt-4 flex gap-2"><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="New category"/><button className="btn-primary" onClick={add} aria-label="Add category"><Plus/></button></div>
        <div className="mt-4 divide-y">{cats.map(c=><p className="py-3 text-sm" key={c.id}>{c.name}</p>)}</div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Locations</h2><button className="btn-primary" onClick={openNewLocation}><Plus size={17}/>Add location</button></div>

        {showLocationForm&&<form className="mt-5 grid gap-4 rounded-xl border bg-slate-50 p-4" onSubmit={saveLocation}>
          <div className="flex items-center justify-between"><h3 className="font-semibold">{editingLocationId?'Edit location':'New location'}</h3><button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" onClick={closeLocationForm} aria-label="Close location form"><X size={18}/></button></div>
          <div><label className="label">Building</label><input className="input" required value={locationForm.building} onChange={e=>setLocationForm({...locationForm,building:e.target.value})} placeholder="e.g. Main Building"/></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Floor</label><input className="input" value={locationForm.floor} onChange={e=>setLocationForm({...locationForm,floor:e.target.value})} placeholder="e.g. Second Floor"/></div>
            <div><label className="label">Room</label><input className="input" value={locationForm.room} onChange={e=>setLocationForm({...locationForm,room:e.target.value})} placeholder="e.g. Room 201"/></div>
          </div>
          <div><label className="label">Description <span className="font-normal text-slate-400">(optional)</span></label><input className="input" value={locationForm.location_description} onChange={e=>setLocationForm({...locationForm,location_description:e.target.value})} placeholder="Additional location details"/></div>
          {editingLocationId&&<label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={locationForm.is_active} onChange={e=>setLocationForm({...locationForm,is_active:e.target.checked})}/>Available for new complaints</label>}
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={closeLocationForm}>Cancel</button><button className="btn-primary" disabled={savingLocation}>{savingLocation?'Saving…':editingLocationId?'Save changes':'Add location'}</button></div>
        </form>}

        <div className="mt-4 divide-y">{locations.map(location=><div className="flex items-center justify-between gap-4 py-3" key={location.id}><p className={`min-w-0 text-sm ${location.is_active?'':'opacity-50'}`}><b>{location.building}</b>{location.floor&&<> · {location.floor}</>}{location.room&&<> {location.room}</>}{!location.is_active&&<small className="ml-2 rounded-full bg-slate-100 px-2 py-1">Inactive</small>}</p><button className="btn-secondary shrink-0 px-3 py-2" onClick={()=>openEditLocation(location)} aria-label={`Edit ${location.building}`}><Pencil size={15}/>Edit</button></div>)}</div>
      </section>
    </div>
  </div>
}
