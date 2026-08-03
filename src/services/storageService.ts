import { supabase } from '../lib/supabase'
const allowed = ['image/jpeg','image/png','image/webp']
export function validatePhoto(file: File) {
  if (!allowed.includes(file.type)) throw new Error('Use a JPEG, PNG, or WebP image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Each image must be 5 MB or smaller.')
}
export async function uploadComplaintPhoto(file: File, complaintId: string, userId: string, type: 'before'|'progress'|'after') {
  validatePhoto(file)
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-')
  const path=`complaints/${complaintId}/${type}/${crypto.randomUUID()}-${safeName}`
  const upload=await supabase.storage.from('complaint-photos').upload(path,file,{contentType:file.type})
  if(upload.error)return upload
  return supabase.from('complaint_photos').insert({complaint_id:complaintId,uploaded_by:userId,photo_type:type,storage_path:path,file_name:file.name,file_size:file.size,mime_type:file.type})
}
export async function signedPhotoUrl(path:string){return supabase.storage.from('complaint-photos').createSignedUrl(path,3600)}

export async function deleteComplaintPhoto(photoId:string,path:string){
  const removed=await supabase.storage.from('complaint-photos').remove([path])
  if(removed.error)return removed
  return supabase.from('complaint_photos').delete().eq('id',photoId)
}

export async function uploadAvatar(file:File,userId:string){
  validatePhoto(file)
  const path=`${userId}/avatar`
  const upload=await supabase.storage.from('avatars').upload(path,file,{contentType:file.type,upsert:true,cacheControl:'3600'})
  if(upload.error)return{data:null,error:upload.error}
  const{data}=supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl=`${data.publicUrl}?v=${Date.now()}`
  const update=await supabase.from('profiles').update({avatar_url:avatarUrl}).eq('id',userId)
  return{data:update.error?null:avatarUrl,error:update.error}
}
