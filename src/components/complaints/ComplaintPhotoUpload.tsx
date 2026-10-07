import { CheckCircle2, ImagePlus, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { useId } from 'react'
import { useComplaintPhotos, type ComplaintPhotoQueue } from '../../hooks/useComplaintPhotos'
import { MAX_PHOTOS_PER_BATCH } from '../../utils/prepareComplaintPhoto'

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function ComplaintPhotoPicker({ queue, disabled = false }: { queue: ComplaintPhotoQueue; disabled?: boolean }) {
  const inputId = useId()
  const busy = disabled || queue.preparing || queue.uploading
  const uploaded = queue.photos.filter(photo => photo.status === 'uploaded').length
  const started = queue.photos.some(photo => photo.status !== 'ready')
  return <div className="space-y-3">
    <p className="text-sm text-slate-500">Up to {MAX_PHOTOS_PER_BATCH} photos per batch. JPEG, PNG, or WebP, up to 20 MB each. Large photos are automatically resized for upload.</p>
    {queue.photos.length < MAX_PHOTOS_PER_BATCH && <div>
      <label htmlFor={inputId} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-slate-50 p-5 text-sm font-semibold text-forest-700 focus-within:ring-2 focus-within:ring-forest-500 ${busy ? 'opacity-60' : 'hover:border-forest-400'}`}>
        <ImagePlus size={20} />Choose photos
        <input id={inputId} aria-label="Choose photos" className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy}
          onChange={event => { const files = Array.from(event.currentTarget.files || []); event.currentTarget.value = ''; void queue.add(files) }} />
      </label>
    </div>}
    {queue.preparing && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle size={16} className="animate-spin" />Preparing photos…</p>}
    {queue.errors.length > 0 && <div role="alert" className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-700">{queue.errors.map((message, index) => <p key={index} className="break-words">{message}</p>)}</div>}
    {queue.photos.length > 0 && <ul className="grid gap-3 sm:grid-cols-2">
      {queue.photos.map(photo => <li key={photo.id} className="min-w-0 overflow-hidden rounded-xl border bg-white">
        <div className="relative bg-slate-100">
          <img src={photo.preview} alt={`Selected photo: ${photo.file.name}`} className="h-36 w-full object-contain" />
          {photo.status === 'ready' && <button type="button" className="btn-icon btn-icon-danger absolute right-2 top-2" aria-label={`Remove ${photo.file.name}`} disabled={busy} onClick={() => queue.remove(photo.id)}><X size={16} /></button>}
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-semibold" title={photo.file.name}>{photo.file.name}</p>
          <p className="text-xs text-slate-500">{fileSize(photo.file.size)}{photo.file.size < photo.originalSize ? ` · reduced from ${fileSize(photo.originalSize)}` : ''}</p>
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${photo.status === 'failed' ? 'text-red-700' : photo.status === 'uploaded' ? 'text-green-700' : 'text-slate-600'}`}>
            {photo.status === 'uploading' && <LoaderCircle size={14} className="animate-spin" />}
            {photo.status === 'uploaded' && <CheckCircle2 size={14} />}
            {{ ready: 'Ready to upload', uploading: 'Uploading…', uploaded: 'Uploaded', failed: 'Not uploaded — retry below' }[photo.status]}
          </p>
        </div>
      </li>)}
    </ul>}
    {started && <div role="status" className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-700">{uploaded} of {queue.photos.length} photos uploaded</p>
      <progress aria-label="Photos uploaded" className="h-2 w-full accent-forest-700" max={queue.photos.length} value={uploaded} />
    </div>}
    {queue.photos.some(photo => photo.status === 'failed') && <p className="text-sm text-red-700">Some photos could not be uploaded. Check your connection, then retry. Photos already uploaded will be kept.</p>}
  </div>
}

export function ComplaintPhotoUpload({ complaintId, userId, type, onUploaded }: {
  complaintId: string; userId: string; type: 'before' | 'progress' | 'after'; onUploaded: () => Promise<void>
}) {
  const queue = useComplaintPhotos()
  const pending = queue.photos.some(photo => photo.status !== 'uploaded')
  const failed = queue.photos.some(photo => photo.status === 'failed')
  async function upload() {
    await queue.uploadAll(complaintId, userId, type)
    await onUploaded()
  }
  return <div className="space-y-4">
    <ComplaintPhotoPicker queue={queue} />
    {pending && <button type="button" className="btn-primary" disabled={queue.preparing || queue.uploading} onClick={() => void upload()}>
      {queue.uploading ? <LoaderCircle size={16} className="animate-spin" /> : failed ? <RefreshCw size={16} /> : <ImagePlus size={16} />}
      {queue.uploading ? 'Uploading photos…' : failed ? 'Retry remaining photos' : 'Upload selected photos'}
    </button>}
    {!pending && queue.photos.length > 0 && <button type="button" className="btn-secondary" onClick={queue.clear}>Choose another batch</button>}
    <p className="text-xs text-slate-500">Keep this page open until uploads finish. If you leave, return to this complaint and select any missing photos again.</p>
  </div>
}
