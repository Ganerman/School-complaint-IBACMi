import { supabase } from '../lib/supabase'
const allowed = ['image/jpeg','image/png','image/webp']
export function validatePhoto(file: File) {
  if (!allowed.includes(file.type)) throw new Error('Use a JPEG, PNG, or WebP image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Each image must be 5 MB or smaller.')
}
export async function uploadComplaintPhoto(file: File, complaintId: string, userId: string, type: 'before'|'progress'|'after') {
  validatePhoto(file)
  // A content-based UUID also recognizes a photo selected again after a refresh.
  const content=await new Blob([JSON.stringify([complaintId,userId,type,file.name]),file]).arrayBuffer()
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',content)).slice(0,16)
  digest[6]=(digest[6]&0x0f)|0x80
  digest[8]=(digest[8]&0x3f)|0x80
  const hex=Array.from(digest,value=>value.toString(16).padStart(2,'0')).join('')
  const uploadId=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-')
  const path=`complaints/${complaintId}/${type}/${uploadId}-${safeName}`
  // Reuse this ID on retry, including when a response was lost after a successful write.
  const existing=await supabase.from('complaint_photos').select('id,storage_path').eq('id',uploadId).maybeSingle()
  if(existing.error)return {error:existing.error}
  if(existing.data)return {error:existing.data.storage_path===path?null:new Error('Photo upload reference does not match.')}
  const upload=await supabase.storage.from('complaint-photos').upload(path,file,{contentType:file.type})
  if(upload.error){
    const duplicate=upload.error.statusCode==='409'||/already exists|duplicate/i.test(upload.error.message)
    if(!duplicate)return {error:upload.error}
    // A prior attempt may have saved the object but failed to save its metadata.
    const stored=await supabase.storage.from('complaint-photos').createSignedUrl(path,60)
    if(stored.error)return {error:stored.error}
  }
  const inserted=await supabase.from('complaint_photos').insert({id:uploadId,complaint_id:complaintId,uploaded_by:userId,photo_type:type,storage_path:path,file_name:file.name,file_size:file.size,mime_type:file.type})
  if(inserted.error?.code==='23505'){
    const confirmed=await supabase.from('complaint_photos').select('storage_path').eq('id',uploadId).maybeSingle()
    if(!confirmed.error&&confirmed.data?.storage_path===path)return {error:null}
  }
  return {error:inserted.error}
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
