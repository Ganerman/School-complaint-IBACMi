import { useEffect, useRef, useState } from 'react'
import { uploadComplaintPhoto } from '../services/storageService'
import { MAX_PHOTOS_PER_BATCH, prepareComplaintPhoto } from '../utils/prepareComplaintPhoto'

export interface QueuedPhoto {
  id: string
  file: File
  originalSize: number
  preview: string
  status: 'ready' | 'uploading' | 'uploaded' | 'failed'
}

export function useComplaintPhotos() {
  const [photos, setPhotos] = useState<QueuedPhoto[]>([])
  const [preparing, setPreparing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const queue = useRef<QueuedPhoto[]>([])
  const working = useRef(false)
  const mounted = useRef(true)
  const urls = useRef(new Set<string>())

  useEffect(() => {
    mounted.current = true
    const previews = urls.current
    return () => {
      mounted.current = false
      previews.forEach(url => URL.revokeObjectURL(url))
      previews.clear()
    }
  }, [])

  useEffect(() => {
    if (!preparing && !uploading && !photos.some(photo => photo.status === 'failed')) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [photos, preparing, uploading])

  function update(next: QueuedPhoto[]) {
    queue.current = next
    if (mounted.current) setPhotos(next)
  }

  async function add(files: File[]) {
    if (working.current) return
    working.current = true
    setPreparing(true)
    const messages: string[] = []
    setErrors([])
    try {
      for (const source of files) {
        if (!mounted.current) break
        if (queue.current.length >= MAX_PHOTOS_PER_BATCH) {
          messages.push(`Choose up to ${MAX_PHOTOS_PER_BATCH} photos per batch. Extra photos were not added.`)
          break
        }
        try {
          const file = await prepareComplaintPhoto(source)
          if (!mounted.current) break
          const preview = URL.createObjectURL(file)
          urls.current.add(preview)
          update([...queue.current, { id: crypto.randomUUID(), file, originalSize: source.size, preview, status: 'ready' }])
        } catch (error) {
          messages.push(`${source.name}: ${error instanceof Error ? error.message : 'Could not prepare this photo.'}`)
        }
      }
    } finally {
      working.current = false
      if (mounted.current) { setPreparing(false); setErrors(messages) }
    }
  }

  function remove(id: string) {
    if (working.current) return
    const photo = queue.current.find(item => item.id === id)
    if (!photo || photo.status !== 'ready') return
    URL.revokeObjectURL(photo.preview)
    urls.current.delete(photo.preview)
    update(queue.current.filter(item => item.id !== id))
  }

  function clear() {
    if (working.current) return
    urls.current.forEach(url => URL.revokeObjectURL(url))
    urls.current.clear()
    update([])
    setErrors([])
  }

  async function uploadAll(complaintId: string, userId: string, type: 'before' | 'progress' | 'after') {
    if (working.current) return false
    working.current = true
    setUploading(true)
    try {
      const pending = queue.current.filter(photo => photo.status !== 'uploaded')
      for (const photo of pending) {
        if (!mounted.current) return false
        update(queue.current.map(item => item.id === photo.id ? { ...item, status: 'uploading' } : item))
        try {
          const result = await uploadComplaintPhoto(photo.file, complaintId, userId, type)
          if (result.error) throw result.error
          update(queue.current.map(item => item.id === photo.id ? { ...item, status: 'uploaded' } : item))
        } catch (error) {
          console.error('Photo upload failed', error)
          update(queue.current.map(item => item.id === photo.id ? { ...item, status: 'failed' } : item))
        }
      }
      return queue.current.every(photo => photo.status === 'uploaded')
    } finally {
      working.current = false
      if (mounted.current) setUploading(false)
    }
  }

  return { photos, preparing, uploading, errors, add, remove, clear, uploadAll }
}

export type ComplaintPhotoQueue = ReturnType<typeof useComplaintPhotos>
