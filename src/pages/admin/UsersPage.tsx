import { useEffect, useState } from 'react'
import { CheckCircle2, Pencil, Search, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types'
import { humanize } from '../../utils/format'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingScreen } from '../../components/common/States'
import { readAllRows } from '../../utils/pagination'

const specializationCategories = [
 'IT and Facilities Maintenance Specialist',
 'Building Maintenance Technician',
]


function roleLabel(profile: Profile) {
 if (profile.role === 'maintenance') return 'IBA Maintenance'
 return profile.role === 'student' ? humanize(profile.account_type) : humanize(profile.role)
}

function filterRole(profile: Profile): 'student'|'teacher'|'staff'|'technician'|'admin' {
 if (profile.role === 'admin') return 'admin'
 if (profile.role === 'maintenance') return 'technician'
 return profile.account_type
}

export function UsersPage(){
 const{user:currentUser}=useAuth();const[users,setUsers]=useState<Profile[]>([]);const[query,setQuery]=useState('');const[editing,setEditing]=useState<Profile|null>(null);const[role,setRole]=useState<Profile['role']>('student');const[specialization,setSpecialization]=useState('');const[specializationCategory,setSpecializationCategory]=useState('');const[saving,setSaving]=useState(false)
 const[searchParams,setSearchParams]=useSearchParams()
 const requestedRole=searchParams.get('role')||'all'
 const systemRole=['student','teacher','staff','technician','admin'].includes(requestedRole)?requestedRole:'all'
 const requestedVerification=searchParams.get('verification')||''
 const verification=['pending','approved','rejected'].includes(requestedVerification)?requestedVerification:''
 const[loading,setLoading]=useState(true);const[loadError,setLoadError]=useState('')
 function setFilter(key:string,value:string){setSearchParams(previous=>{const next=new URLSearchParams(previous);if(value)next.set(key,value);else next.delete(key);return next},{replace:true})}
 async function load(){const{data,error}=await readAllRows((from,to)=>supabase.from('profiles').select('*').order('created_at',{ascending:false}).order('id').range(from,to));setLoadError(error?'Unable to load users. Please refresh and try again.':'');if(!error)setUsers((data||[]) as Profile[]);setLoading(false)}
 useEffect(()=>{void load()},[])
 function edit(profile:Profile){const currentSpecialization=profile.specialization||'';setEditing(profile);setRole(profile.role);setSpecialization(currentSpecialization);setSpecializationCategory(specializationCategories.includes(currentSpecialization)?currentSpecialization:currentSpecialization?'Other':'')}
 function close(){setEditing(null);setSpecialization('');setSpecializationCategory('')}
 async function verify(profile:Profile,decision:'approved'|'rejected'){setSaving(true);const{error}=await supabase.rpc('admin_verify_account',{target_user_id:profile.id,decision});setSaving(false);if(error)return toast.error('Verification failed. Apply the latest Supabase SQL update first.');toast.success(decision==='approved'?`${humanize(profile.account_type)} account approved.`:'Account registration rejected.');await load()}
 async function save(e:React.FormEvent){e.preventDefault();if(!editing)return;setSaving(true);const{error}=await supabase.rpc('admin_manage_user_role',{target_user_id:editing.id,new_role:role,new_specialization:specialization});setSaving(false);if(error){const message=error.message.includes('Only verified school staff')?'Only verified Staff accounts can be assigned IBA Maintenance.':error.message.includes('User must be verified first')?'Approve this account before changing its role.':error.message.includes('Administrators cannot change their own role')?'You cannot change your own role.':'Could not update the user role. Check that the latest Supabase SQL migrations are applied.';return toast.error(message)}toast.success(role==='maintenance'?'IBA Maintenance role assigned. This account can now receive maintenance assignments.':'User role updated.');close();await load()}
 const shown=users.filter(u=>(systemRole==='all'||filterRole(u)===systemRole)&&(!verification||u.verification_status===verification)&&`${u.full_name} ${u.email||''} ${u.student_id||''} ${u.specialization||''} ${u.department||''} ${u.account_type} ${roleLabel(u)}`.toLowerCase().includes(query.toLowerCase()))
 const pending=users.filter(u=>u.verification_status==='pending'&&['teacher','staff'].includes(u.account_type)).length
 if(loading)return <LoadingScreen/>
 return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="display text-4xl">Users & staff</h1><p className="mt-2 text-slate-500">Verify teacher/staff identities and manage system roles.</p>{pending>0&&<p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{pending} account{pending===1?'':'s'} awaiting verification</p>}</div><div className="flex flex-wrap items-end gap-3"><label><span className="label">System role</span><select className="input min-w-40" value={systemRole} onChange={e=>setFilter('role',e.target.value==='all'?'':e.target.value)}><option value="all">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="staff">Staff</option><option value="technician">IBA Maintenance</option><option value="admin">Administrators</option></select></label><label><span className="label">Verification</span><select className="input min-w-40" value={verification} onChange={e=>setFilter('verification',e.target.value)}><option value="">All verification statuses</option><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><label className="relative min-w-64"><span className="label">Search</span><Search className="absolute bottom-3 left-3 text-slate-400" size={18}/><input className="input pl-10" placeholder="Name, email, or ID" value={query} onChange={e=>setQuery(e.target.value)}/></label>{(query||systemRole!=='all'||verification)&&<button type="button" className="btn-secondary" onClick={()=>{setQuery('');setSearchParams({},{replace:true})}}><X size={16}/>Clear</button>}</div></div>
 {loadError&&<div className="mt-5"><ErrorState message={loadError}/></div>}
 {!loadError&&shown.length===0&&<div className="mt-5"><EmptyState title="No matching users" message="No accounts match the selected role, verification status, or search."/></div>}
 <div className="card mt-7 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">Name</th><th>Account type</th><th>ID / department</th><th>System role</th><th>Verification</th><th className="pr-5 text-right">Action</th></tr></thead><tbody>{shown.map(u=><tr className="border-b last:border-0" key={u.id}><td className="px-5 py-4"><b>{u.full_name}</b><small className="block text-slate-400">{u.email}</small></td><td>{humanize(u.account_type)}</td><td><span>{u.student_id||'—'}</span>{u.department&&<small className="block text-slate-400">{u.department}</small>}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role==='maintenance'?'bg-amber-100 text-amber-800':u.role==='admin'?'bg-forest-100 text-forest-800':u.account_type==='teacher'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-700'}`}>{roleLabel(u)}</span></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.verification_status==='approved'?'bg-green-100 text-green-700':u.verification_status==='pending'?'bg-amber-100 text-amber-800':'bg-red-100 text-red-700'}`}>{humanize(u.verification_status)}</span></td><td className="pr-5"><div className="flex justify-end gap-2">{u.verification_status==='pending'&&<><button className="btn-primary btn-sm" disabled={saving} onClick={()=>verify(u,'approved')}><CheckCircle2 size={15}/>Approve</button><button className="btn-danger btn-sm" disabled={saving} onClick={()=>verify(u,'rejected')}><XCircle size={15}/>Reject</button></>}<button className="btn-secondary btn-sm" disabled={u.id===currentUser?.id||u.verification_status!=='approved'} onClick={()=>edit(u)}><Pencil size={15}/>Manage role</button></div></td></tr>)}</tbody></table></div>
 {editing&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title"><form className="card w-full max-w-md p-6" onSubmit={save}><div className="flex items-start justify-between gap-4"><div><h2 id="role-dialog-title" className="text-lg font-bold">Manage user role</h2><p className="mt-1 text-sm text-slate-500">{editing.full_name} · {humanize(editing.account_type)}</p></div><button type="button" className="btn-icon btn-icon-sm" onClick={close} aria-label="Close"><X size={19}/></button></div><label className="mt-5 block"><span className="label">System role</span><select className="input" value={role} onChange={e=>setRole(e.target.value as Profile['role'])}><option value="student">{humanize(editing.account_type)} portal / reporter</option>{editing.account_type==='staff'&&<option value="maintenance">IBA Maintenance</option>}<option value="admin">Administrator</option></select></label>{role==='maintenance'&&<div className="mt-4 grid gap-3"><label><span className="label">Maintenance specialization</span><select className="input" value={specializationCategory} onChange={e=>{const category=e.target.value;setSpecializationCategory(category);setSpecialization(category==='Other'?'':category)}}><option value="">Select a specialization</option>{specializationCategories.map(category=><option key={category} value={category}>{category}</option>)}</select></label>{specializationCategory==='Other'&&<label><span className="label">Other specialization</span><input className="input" maxLength={100} placeholder="Enter a maintenance skill" value={specialization} onChange={e=>setSpecialization(e.target.value)}/></label>}</div>}<div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={saving}>{saving?'Saving…':'Save role'}</button></div></form></div>}
 </div>
}
