import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { complaintService } from '../../services/complaintService'
import { uploadComplaintPhoto, validatePhoto } from '../../services/storageService'
import { useAuth } from '../../hooks/useAuth'
import type { ComplaintCategory, ComplaintPriority, Location } from '../../types'
import { friendlyError } from '../../utils/errors'

export function NewComplaintPage(){
  const {user}=useAuth()
  const navigate=useNavigate()
  const [categories,setCategories]=useState<ComplaintCategory[]>([])
  const [locations,setLocations]=useState<Location[]>([])
  const [file,setFile]=useState<File|null>(null)
  const [preview,setPreview]=useState('')
  const [busy,setBusy]=useState(false)
  const [form,setForm]=useState({title:'',description:'',category_id:'',other_category:'',location_id:'',priority:'medium' as ComplaintPriority})

  useEffect(()=>{
    void Promise.all([complaintService.categories(),complaintService.locations()]).then(([categoryResult,locationResult])=>{
      setCategories((categoryResult.data||[]) as ComplaintCategory[])
      setLocations((locationResult.data||[]) as Location[])
    })
  },[])

  const selectedCategory=useMemo(()=>categories.find(category=>category.id===form.category_id),[categories,form.category_id])
  const isOtherCategory=selectedCategory?.name.toLowerCase()==='other'

  function choose(selectedFile?:File){
    if(!selectedFile)return
    try{
      validatePhoto(selectedFile)
      if(preview)URL.revokeObjectURL(preview)
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }catch(error){toast.error((error as Error).message)}
  }

  async function submit(event:FormEvent){
    event.preventDefault()
    if(!user)return
    const title=form.title.trim()
    const description=form.description.trim()
    const otherCategory=form.other_category.trim()
    if(title.length<3)return toast.error('Complaint title must contain at least 3 characters.')
    if(description.length<10)return toast.error('Description must contain at least 10 characters.')
    if(isOtherCategory&&otherCategory.length<3)return toast.error('Please specify the other category using at least 3 characters.')

    setBusy(true)
    const {data,error}=await complaintService.create({
      reporter_id:user.id,
      title,
      description,
      category_id:form.category_id,
      other_category:isOtherCategory?otherCategory:null,
      location_id:form.location_id,
      priority:form.priority,
    })
    if(error){
      setBusy(false)
      console.error('Complaint submission failed',error)
      let constraintMessage='One of the complaint fields does not satisfy the database requirements.'
      if(error.message.includes('complaints_title_check'))constraintMessage='Complaint title must contain between 3 and 150 characters.'
      if(error.message.includes('complaints_description_check'))constraintMessage='Description must contain between 10 and 2,000 characters.'
      if(error.message.includes('other complaint category'))constraintMessage='Please specify the other category using at least 3 characters.'
      const messages:Record<string,string>={
        '42501':'Your account does not have permission to submit complaints. Check the profiles role and RLS policies.',
        '23502':'The complaint-number database trigger is missing or inactive. Apply the latest Supabase migration.',
        '23514':constraintMessage,
        '23503':'The selected category or location no longer exists. Please refresh the page.',
        'PGRST301':'Your login session has expired. Sign out and sign in again.',
      }
      return toast.error(messages[error.code]||friendlyError(error,`Unable to submit complaint (code: ${error.code||'unknown'}).`),{duration:8000})
    }
    if(file){
      const upload=await uploadComplaintPhoto(file,data.id,user.id,'before')
      if(upload.error)toast.warning('Complaint saved, but the photo could not be uploaded.')
    }
    toast.success('Complaint submitted successfully.')
    navigate(`/student/complaints/${data.id}`)
  }

  return <div className="mx-auto max-w-3xl">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">Student report</p>
    <h1 className="display mt-1 text-4xl">Submit a complaint</h1>
    <p className="mt-2 text-slate-500">Give the maintenance team clear, specific information.</p>
    <form className="card mt-7 grid gap-5 p-6 md:p-8" onSubmit={submit}>
      <div><label className="label">Complaint title</label><input className="input" minLength={3} maxLength={150} required placeholder="e.g. Leaking pipe in second-floor restroom" value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/><small className="mt-1 block text-slate-400">3–150 characters</small></div>
      <div><label className="label">Description</label><textarea className="input min-h-32 resize-y" minLength={10} maxLength={2000} required placeholder="Describe what you observed and when it started…" value={form.description} onChange={event=>setForm({...form,description:event.target.value})}/><small className="mt-1 block text-slate-400">At least 10 characters</small></div>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <div><label className="label">Category</label><select className="input" required value={form.category_id} onChange={event=>setForm({...form,category_id:event.target.value,other_category:''})}><option value="">Select a category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select>{isOtherCategory&&<div className="mt-3"><label className="label" htmlFor="other-category">Specify other category</label><input id="other-category" className="input" required autoFocus minLength={3} maxLength={100} placeholder="e.g. School signage" value={form.other_category} onChange={event=>setForm({...form,other_category:event.target.value})}/><small className="mt-1 block text-slate-400">Describe the type of facility concern.</small></div>}</div>
        <div><label className="label">Building / room</label><select className="input" required value={form.location_id} onChange={event=>setForm({...form,location_id:event.target.value})}><option value="">Select a location</option>{locations.map(location=><option key={location.id} value={location.id}>{location.building} {location.floor&&`· ${location.floor}`} {location.room&&`· ${location.room}`}</option>)}</select></div>
      </div>
      <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={event=>setForm({...form,priority:event.target.value as ComplaintPriority})}><option value="low">Low — minor issue</option><option value="medium">Medium — affects normal use</option><option value="high">High — significant disruption or risk</option><option value="emergency">Emergency — immediate safety risk</option></select><p className="mt-1.5 text-xs text-slate-400">Emergency reports are due within 4 hours and should describe the immediate risk.</p></div>
      <div><label className="label">Photo evidence <span className="font-normal text-slate-400">(optional, max 5 MB)</span></label>{preview?<div className="relative mt-2 overflow-hidden rounded-xl border bg-slate-100"><img src={preview} alt="Complaint preview" className="h-60 w-full object-contain"/><button type="button" className="absolute right-3 top-3 rounded-full bg-slate-900/70 p-2 text-white" onClick={()=>{URL.revokeObjectURL(preview);setFile(null);setPreview('')}}><X size={17}/></button></div>:<label className="mt-2 grid cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-slate-50 px-5 py-10 text-center hover:border-forest-400"><ImagePlus className="text-forest-600"/><b className="mt-2 text-sm">Choose a clear photo</b><small className="mt-1 text-slate-400">JPEG, PNG, or WebP</small><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>choose(event.target.files?.[0])}/></label>}</div>
      <div className="flex justify-end gap-3 border-t pt-5"><button type="button" className="btn-secondary" onClick={()=>navigate(-1)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy?'Submitting…':'Submit complaint'}</button></div>
    </form>
  </div>
}
