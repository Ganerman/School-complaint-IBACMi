import { useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { authService } from '../../services/authService'
import { uploadAvatar, validatePhoto } from '../../services/storageService'

export function ProfilePage(){
  const{profile,refreshProfile}=useAuth()
  const[form,setForm]=useState({full_name:profile?.full_name||'',contact_number:profile?.contact_number||'',course:profile?.course||'',year_level:profile?.year_level||'',specialization:profile?.specialization||''})
  const[password,setPassword]=useState('')
  const[uploadingAvatar,setUploadingAvatar]=useState(false)
  const[avatarPreview,setAvatarPreview]=useState(profile?.avatar_url||'')
  if(!profile)return null
  const profileId=profile.id
  const savedAvatar=profile.avatar_url||''

  async function save(e:FormEvent){
    e.preventDefault()
    const{error}=await supabase.from('profiles').update(form).eq('id',profileId)
    if(error)return toast.error('Unable to update profile.')
    await refreshProfile()
    toast.success('Profile updated.')
  }

  async function chooseAvatar(file?:File){
    if(!file)return
    try{validatePhoto(file)}catch(error){return toast.error((error as Error).message)}
    const temporaryUrl=URL.createObjectURL(file)
    setAvatarPreview(temporaryUrl)
    setUploadingAvatar(true)
    const{data,error}=await uploadAvatar(file,profileId)
    setUploadingAvatar(false)
    URL.revokeObjectURL(temporaryUrl)
    if(error){console.error('Avatar upload failed',error);setAvatarPreview(savedAvatar);return toast.error(`Could not upload profile picture: ${error.message}`)}
    setAvatarPreview(data||'')
    await refreshProfile()
    toast.success('Profile picture updated.')
  }

  async function changePassword(e:FormEvent){
    e.preventDefault()
    const{error}=await authService.updatePassword(password)
    if(error)return toast.error('Unable to change password.')
    setPassword('')
    toast.success('Password changed.')
  }

  return <div>
    <h1 className="display text-4xl">Your profile</h1>
    <p className="mt-2 text-slate-500">Manage your personal and account information.</p>
    <section className="card mt-7 flex flex-col items-center gap-5 p-6 sm:flex-row">
      <div className="relative">
        {avatarPreview?<img src={avatarPreview} alt={`${profile.full_name} profile`} className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"/>:<span className="grid h-28 w-28 place-items-center rounded-full bg-forest-100 text-4xl font-bold text-forest-700">{profile.full_name.slice(0,1).toUpperCase()}</span>}
        <label className="absolute bottom-0 right-0 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-forest-800 text-white shadow-lg transition hover:bg-forest-700" aria-label="Choose profile picture"><Camera size={18}/><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingAvatar} onChange={e=>void chooseAvatar(e.target.files?.[0])}/></label>
      </div>
      <div className="text-center sm:text-left"><h2 className="text-xl font-bold">{profile.full_name}</h2><p className="mt-1 text-sm text-slate-500">{profile.email}</p><label className="btn-secondary mt-4 cursor-pointer"><Camera size={17}/>{uploadingAvatar?'Uploading…':'Change profile picture'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingAvatar} onChange={e=>void chooseAvatar(e.target.files?.[0])}/></label><p className="mt-2 text-xs text-slate-400">JPEG, PNG, or WebP · Maximum 5 MB</p></div>
    </section>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form className="card grid gap-5 p-6" onSubmit={save}><h2 className="font-bold">Personal information</h2><div><label className="label">Full name</label><input className="input" required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div><div><label className="label">School ID</label><input className="input bg-slate-50" disabled value={profile.student_id||'Not assigned'}/></div><div><label className="label">Email</label><input className="input bg-slate-50" disabled value={profile.email||''}/></div><div><label className="label">Contact number</label><input className="input" value={form.contact_number} onChange={e=>setForm({...form,contact_number:e.target.value})}/></div>{profile.role==='student'&&<div className="grid grid-cols-2 gap-4"><div><label className="label">Course</label><input className="input" value={form.course} onChange={e=>setForm({...form,course:e.target.value})}/></div><div><label className="label">Year level</label><input className="input" value={form.year_level} onChange={e=>setForm({...form,year_level:e.target.value})}/></div></div>}{profile.role==='maintenance'&&<div><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={e=>setForm({...form,specialization:e.target.value})}/></div>}<button className="btn-primary justify-self-start">Save changes</button></form>
      <form className="card h-fit grid gap-5 p-6" onSubmit={changePassword}><h2 className="font-bold">Change password</h2><div><label className="label">New password</label><input className="input" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></div><button className="btn-secondary justify-self-start">Update password</button></form>
    </div>
  </div>
}
