import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
export function useRealtime(table:string,onChange:()=>void){
  useEffect(()=>{const channel=supabase.channel(`${table}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table},onChange).subscribe();return()=>{void supabase.removeChannel(channel)}},[table,onChange])
}
