import { supabase } from '../lib/supabase'
import type { CampusMoment } from '../types'
import { validatePhoto } from './storageService'

const bucket = 'campus-moments'

function withPublicUrl(moment: CampusMoment): CampusMoment {
  const { data } = supabase.storage.from(bucket).getPublicUrl(moment.storage_path)
  return { ...moment, image_url: data.publicUrl }
}

export const campusMomentService = {
  async listPublished() {
    const result = await supabase
      .from('campus_moments')
      .select('*')
      .eq('is_published', true)
      .order('display_order')
      .order('created_at', { ascending: false })
    return { ...result, data: (result.data as CampusMoment[] | null)?.map(withPublicUrl) ?? null }
  },

  async listAll() {
    const result = await supabase
      .from('campus_moments')
      .select('*')
      .order('display_order')
      .order('created_at', { ascending: false })
    return { ...result, data: (result.data as CampusMoment[] | null)?.map(withPublicUrl) ?? null }
  },

  async create(file: File, input: {
    title: string
    caption: string | null
    event_date: string | null
    is_published: boolean
    uploaded_by: string
  }) {
    validatePhoto(file)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const storagePath = `moments/${crypto.randomUUID()}-${safeName}`
    const upload = await supabase.storage.from(bucket).upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
    })
    if (upload.error) return { data: null, error: upload.error }

    const result = await supabase.from('campus_moments').insert({
      ...input,
      title: input.title.trim(),
      caption: input.caption?.trim() || null,
      storage_path: storagePath,
    }).select().single()

    if (result.error) await supabase.storage.from(bucket).remove([storagePath])
    return {
      ...result,
      data: result.data ? withPublicUrl(result.data as CampusMoment) : null,
    }
  },

  async setPublished(id: string, isPublished: boolean) {
    return supabase.from('campus_moments').update({ is_published: isPublished }).eq('id', id)
  },

  async remove(moment: CampusMoment) {
    const storageResult = await supabase.storage.from(bucket).remove([moment.storage_path])
    if (storageResult.error) return storageResult
    return supabase.from('campus_moments').delete().eq('id', moment.id)
  },
}
