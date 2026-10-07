import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarDays, Eye, EyeOff, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, ErrorState } from '../../components/common/States'
import { useAuth } from '../../hooks/useAuth'
import { campusMomentService } from '../../services/campusMomentService'
import type { CampusMoment } from '../../types'

export function CampusMomentsPage() {
  const { profile } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [moments, setMoments] = useState<CampusMoment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', caption: '', event_date: '', is_published: false })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await campusMomentService.listAll()
    setMoments(data || [])
    setError(loadError ? 'Campus moments could not be loaded. Apply the latest Supabase migration, then try again.' : '')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!profile || !file || !form.title.trim()) return
    setSaving(true)
    const { data, error: saveError } = await campusMomentService.create(file, {
      title: form.title,
      caption: form.caption || null,
      event_date: form.event_date || null,
      is_published: form.is_published,
      uploaded_by: profile.id,
    })
    setSaving(false)
    if (saveError || !data) {
      toast.error(saveError?.message || 'The campus photo could not be uploaded.')
      return
    }
    setMoments(current => [data, ...current])
    setFile(null)
    setForm({ title: '', caption: '', event_date: '', is_published: false })
    if (fileInput.current) fileInput.current.value = ''
    toast.success('Campus moment added to the gallery.')
  }

  async function togglePublished(moment: CampusMoment) {
    setBusyId(moment.id)
    const nextValue = !moment.is_published
    const { error: updateError } = await campusMomentService.setPublished(moment.id, nextValue)
    setBusyId(null)
    if (updateError) return toast.error('The visibility could not be updated.')
    setMoments(current => current.map(item => item.id === moment.id ? { ...item, is_published: nextValue } : item))
    toast.success(nextValue ? 'Photo published on the landing page.' : 'Photo hidden from the landing page.')
  }

  async function remove(moment: CampusMoment) {
    if (!confirm(`Delete “${moment.title}” permanently?`)) return
    setBusyId(moment.id)
    const { error: removeError } = await campusMomentService.remove(moment)
    setBusyId(null)
    if (removeError) return toast.error('The campus photo could not be deleted.')
    setMoments(current => current.filter(item => item.id !== moment.id))
    toast.success('Campus moment deleted.')
  }

  return <div>
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">Landing page gallery</p>
      <h1 className="display mt-2 text-4xl">Campus Moments</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Manage the photos shown in the “Life at IBA, in motion” globe. Publish school events, activities, achievements, and campus life.</p>
    </div>

    <form className="card mt-7 p-5 md:p-6" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-50 text-forest-700"><ImagePlus size={22}/></span>
        <div><h2 className="font-bold">Add a campus photo</h2><p className="text-sm text-slate-500">JPEG, PNG, or WebP up to 5 MB.</p></div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label><span className="label">Photo</span><input ref={fileInput} className="input file:mr-3 file:rounded-lg file:border-0 file:bg-forest-50 file:px-3 file:py-1 file:font-semibold file:text-forest-700" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setFile(event.target.files?.[0] || null)}/></label>
        <label><span className="label">Title</span><input className="input" maxLength={120} required placeholder="e.g. Intramurals 2026" value={form.title} onChange={event => setForm({...form, title: event.target.value})}/></label>
        <label><span className="label">Event date <span className="font-normal text-slate-400">(optional)</span></span><input className="input" type="date" value={form.event_date} onChange={event => setForm({...form, event_date: event.target.value})}/></label>
        <label><span className="label">Short caption <span className="font-normal text-slate-400">(optional)</span></span><input className="input" maxLength={300} placeholder="A memorable day on campus" value={form.caption} onChange={event => setForm({...form, caption: event.target.value})}/></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 accent-[#800000]" checked={form.is_published} onChange={event => setForm({...form, is_published: event.target.checked})}/>Publish immediately on the landing page</label>
        <button className="btn-primary" disabled={saving || !file || !form.title.trim()} type="submit">{saving ? <LoaderCircle className="animate-spin" size={18}/> : <ImagePlus size={18}/>} {saving ? 'Uploading…' : 'Add to gallery'}</button>
      </div>
    </form>

    <div className="mt-9 flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Gallery photos</h2><p className="mt-1 text-sm text-slate-500">{moments.filter(item => item.is_published).length} published · {moments.length} total</p></div></div>
    {error && <div className="mt-5"><ErrorState message={error}/></div>}
    {loading ? <div className="mt-5 grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-forest-700"/></div> : !moments.length ? <div className="mt-5"><EmptyState title="No campus moments yet" message="Upload the first photo to bring the landing-page globe to life."/></div> :
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {moments.map(moment => <article className="card overflow-hidden" key={moment.id}>
          <div className="relative h-52 bg-slate-100"><img className="h-full w-full object-cover" src={moment.image_url} alt={moment.title}/><span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow ${moment.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-800 text-white'}`}>{moment.is_published ? 'Published' : 'Hidden'}</span></div>
          <div className="p-5"><h3 className="font-bold text-slate-900">{moment.title}</h3>{moment.caption && <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{moment.caption}</p>}{moment.event_date && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays size={14}/>{new Date(`${moment.event_date}T00:00:00`).toLocaleDateString()}</p>}
            <div className="mt-4 flex gap-2 border-t pt-4"><button className="btn-secondary flex-1" disabled={busyId === moment.id} type="button" onClick={() => void togglePublished(moment)}>{moment.is_published ? <EyeOff size={16}/> : <Eye size={16}/>} {moment.is_published ? 'Hide' : 'Publish'}</button><button className="btn-icon btn-icon-danger" aria-label={`Delete ${moment.title}`} disabled={busyId === moment.id} type="button" onClick={() => void remove(moment)}><Trash2 size={17}/></button></div>
          </div>
        </article>)}
      </div>}
  </div>
}
