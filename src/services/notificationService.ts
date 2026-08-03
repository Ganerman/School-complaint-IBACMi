import { supabase } from '../lib/supabase'
export const notificationService={
  list:()=>supabase.from('notifications').select('*').order('created_at',{ascending:false}),
  unreadCount:()=>supabase.from('notifications').select('id',{count:'exact',head:true}).eq('is_read',false),
  markRead:(id:string)=>supabase.from('notifications').update({is_read:true}).eq('id',id),
  markAllRead:()=>supabase.rpc('mark_all_notifications_read'),
}
