import { supabase } from '../lib/supabase'
import { readAllRows } from '../utils/pagination'
import type { Complaint, ComplaintStatusHistory, Profile } from '../types'

export type DashboardComplaint = Pick<Complaint, 'id' | 'complaint_number' | 'title' | 'status' | 'priority' | 'assigned_staff_id' | 'location_id' | 'sla_deadline' | 'submitted_at'> & {
  location: { building: string; floor: string | null; room: string | null } | null
}
export type DashboardStaff = Pick<Profile, 'id' | 'full_name' | 'specialization' | 'account_status' | 'verification_status'>
export type DashboardUser = Pick<Profile, 'id' | 'full_name' | 'email' | 'account_type' | 'verification_status' | 'created_at'>
export type DashboardActivity = Pick<ComplaintStatusHistory, 'id' | 'complaint_id' | 'new_status' | 'created_at'> & {
  complaint: { complaint_number: string; title: string } | null
}

export const adminDashboardService = {
  complaints: () => readAllRows((from, to) => supabase.from('complaints')
    .select('id,complaint_number,title,status,priority,assigned_staff_id,location_id,sla_deadline,submitted_at,location:locations(building,floor,room)')
    .order('submitted_at', { ascending: false }).order('id').range(from, to)),
  staff: () => readAllRows((from, to) => supabase.from('profiles')
    .select('id,full_name,specialization,account_status,verification_status').eq('role', 'maintenance')
    .order('full_name').order('id').range(from, to)),
  pendingAccounts: () => supabase.from('profiles').select('id', { count: 'exact', head: true })
    .eq('verification_status', 'pending').in('account_type', ['teacher', 'staff']),
  newUsers: (start: string, end: string) => supabase.from('profiles')
    .select('id,full_name,email,account_type,verification_status,created_at')
    .gte('created_at', start).lt('created_at', end)
    .order('created_at', { ascending: false }).order('id').limit(8),
  newUsersCount: (start: string, end: string) => supabase.from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start).lt('created_at', end),
  activity: () => supabase.from('complaint_status_history')
    .select('id,complaint_id,new_status,created_at,complaint:complaints(complaint_number,title)')
    .order('created_at', { ascending: false }).order('id').limit(5),
}
