export type UserRole = 'student' | 'maintenance' | 'admin'
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'emergency'
export type ComplaintStatus =
  | 'submitted' | 'under_review' | 'verified' | 'assigned' | 'in_progress'
  | 'waiting_for_materials' | 'resolved' | 'closed' | 'rejected' | 'reopened'

export interface Profile {
  id: string
  student_id: string | null
  full_name: string
  email: string | null
  contact_number: string | null
  course: string | null
  year_level: string | null
  role: UserRole
  specialization: string | null
  account_status: 'active' | 'inactive'
  avatar_url: string | null
  account_type: 'student' | 'teacher' | 'staff'
  verification_status: 'pending' | 'approved' | 'rejected'
  department: string | null
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface ComplaintCategory {
  id: string; name: string; description: string | null; is_active: boolean
}
export interface Location {
  id: string; building: string; floor: string | null; room: string | null
  location_description: string | null; is_active: boolean
}
export interface Complaint {
  id: string; complaint_number: string; reporter_id: string; title: string; description: string
  category_id: string | null; other_category: string | null; location_id: string | null; priority: ComplaintPriority
  status: ComplaintStatus; assigned_staff_id: string | null; rejection_reason: string | null
  admin_notes: string | null; resolution_details: string | null; materials_used: string | null
  submitted_at: string; verified_at: string | null; assigned_at: string | null; started_at: string | null
  estimated_completion_at: string | null; resolved_at: string | null; closed_at: string | null
  sla_deadline: string; reopened_at: string | null; created_at: string; updated_at: string
  category?: ComplaintCategory | null; location?: Location | null
  reporter?: Pick<Profile, 'id' | 'full_name' | 'student_id' | 'email' | 'contact_number' | 'account_type' | 'avatar_url'> | null
  assigned_staff?: Pick<Profile, 'id' | 'full_name' | 'specialization'> | null
}
export interface ComplaintPhoto {
  id: string; complaint_id: string; uploaded_by: string; photo_type: 'before' | 'progress' | 'after'
  storage_path: string; file_name: string | null; file_size: number | null; mime_type: string | null; created_at: string
  signed_url?: string
}
export interface ComplaintStatusHistory {
  id: string; complaint_id: string; previous_status: ComplaintStatus | null
  new_status: ComplaintStatus; changed_by: string | null; notes: string | null; created_at: string
}
export interface MaintenanceAssignment {
  id: string; complaint_id: string; staff_id: string; assigned_by: string
  assignment_notes: string | null; status: string; assigned_at: string; accepted_at: string | null; completed_at: string | null
}
export interface AppNotification {
  id: string; user_id: string; title: string; message: string; notification_type: string | null
  reference_id: string | null; is_read: boolean; created_at: string
}
export interface Feedback {
  id: string; complaint_id: string; user_id: string; rating: number; comments: string | null; created_at: string
}
export interface AuditLog {
  id: string; user_id: string | null; action: string; description: string | null
  record_type: string | null; record_id: string | null; metadata: Record<string, unknown> | null; created_at: string
}
export type AcademicConcernStatus = 'submitted'|'under_review'|'teacher_notified'|'meeting_scheduled'|'teacher_responded'|'resolved'|'escalated'|'dismissed'
export interface AcademicConcern {
  id:string; concern_number:string; reporter_id:string; teacher_id:string; teacher_name:string
  concern_type:'grade_clarification'|'missing_score'|'attendance'|'classroom_concern'|'conduct'|'other'
  subject_name:string; description:string; status:AcademicConcernStatus; is_confidential:boolean
  admin_notes:string|null; teacher_response:string|null; meeting_at:string|null; resolution:string|null
  handled_by:string|null; created_at:string; updated_at:string; resolved_at:string|null
}
export interface AcademicConcernMessage {
  id:string; concern_id:string; sender_id:string; sender_name:string
  sender_role:'admin'|'student'|'teacher'; audience:'student'|'teacher'
  message:string; created_at:string
}
