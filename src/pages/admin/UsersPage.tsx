import { useEffect, useState } from 'react'
import { Pencil, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types'
import { humanize } from '../../utils/format'

export function UsersPage(){
  const{user:currentUser}=useAuth()
  const[users,setUsers]=useState<Profile[]>([])
  const[query,setQuery]=useState('')
  const[editing,setEditing]=useState<Profile|null>(null)
  const[role,setRole]=useState<Profile['role']>('student')
  const[specialization,setSpecialization]=useState('')
  const[saving,setSaving]=useState(false)

  async function load(){const{data}=await supabase.from('profiles').select('*').order('created_at',{ascending:false});setUsers((data||[]) as Profile[])}
  useEffect(()=>{void load()},[])
  function edit(profile:Profile){setEditing(profile);setRole(profile.role);setSpecialization(profile.specialization||'')}
  function close(){setEditing(null);setSpecialization('')}
  async function save(e:React.FormEvent){
    e.preventDefault();if(!editing)return;setSaving(true)
    const{error}=await supabase.rpc('admin_manage_user_role',{target_user_id:editing.id,new_role:role,new_specialization:specialization})
    setSaving(false)
    if(error)return toast.error('Could not update the user role. Apply the latest Supabase SQL update first.')
    toast.success(role==='maintenance'?'User is now available for maintenance assignments.':'User role updated.')
    close();await load()
  }
  const shown=users.filter(u=>`${u.full_name} ${u.email||''} ${u.student_id||''} ${u.specialization||''}`.toLowerCase().includes(query.toLowerCase()))
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="display text-4xl">Users & staff</h1><p className="mt-2 text-slate-500">Manage who can receive and complete maintenance assignments.</p></div><label className="relative min-w-64"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" placeholder="Search users" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="card mt-7 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">Name</th><th>Role</th><th>School ID / specialization</th><th>Status</th><th className="text-right">Action</th></tr></thead><tbody>{shown.map(u=><tr className="border-b last:border-0" key={u.id}><td className="px-5 py-4"><b>{u.full_name}</b><small className="block text-slate-400">{u.email}</small></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role==='maintenance'?'bg-amber-100 text-amber-800':u.role==='admin'?'bg-forest-100 text-forest-800':'bg-slate-100 text-slate-700'}`}>{humanize(u.role)}</span></td><td>{u.role==='maintenance'?(u.specialization||'General maintenance'):(u.student_id||'—')}</td><td>{humanize(u.account_status)}</td><td className="pr-5 text-right"><button className="btn-secondary px-3 py-2" disabled={u.id===currentUser?.id} onClick={()=>edit(u)}><Pencil size={15}/>{u.id===currentUser?.id?'Current admin':'Manage role'}</button></td></tr>)}</tbody></table></div>
    {editing&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title"><form className="card w-full max-w-md p-6" onSubmit={save}><div className="flex items-start justify-between gap-4"><div><h2 id="role-dialog-title" className="text-lg font-bold">Manage user role</h2><p className="mt-1 text-sm text-slate-500">{editing.full_name}</p></div><button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={close} aria-label="Close"><X size={19}/></button></div><label className="mt-5 block"><span className="label">Account role</span><select className="input" value={role} onChange={e=>setRole(e.target.value as Profile['role'])}><option value="student">Student / reporter</option><option value="maintenance">Maintenance staff</option><option value="admin">Administrator</option></select></label>{role==='maintenance'&&<label className="mt-4 block"><span className="label">Specialization</span><input className="input" maxLength={100} placeholder="e.g. Electrical, Plumbing, General" value={specialization} onChange={e=>setSpecialization(e.target.value)}/><small className="mt-1 block text-slate-400">This helps select the right staff for a complaint.</small></label>}<div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={saving}>{saving?'Saving…':'Save role'}</button></div></form></div>}
  </div>
}
