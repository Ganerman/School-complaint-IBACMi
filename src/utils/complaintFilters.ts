import type { Complaint } from '../types'

type FilterableComplaint = Pick<Complaint, 'status' | 'sla_deadline' | 'assigned_staff_id'>

export const complaintViews = {
  open: 'Open complaints',
  active: 'Active work',
  resolved: 'Resolved / closed',
  overdue: 'Overdue',
  review: 'Needs review',
  unassigned: 'Needs assignment',
} as const

export type ComplaintView = keyof typeof complaintViews

export function isComplaintView(value: string | null): value is ComplaintView {
  return value !== null && Object.hasOwn(complaintViews, value)
}

export function isOpenComplaint(item: Pick<Complaint, 'status'>) {
  return !['resolved', 'closed', 'rejected'].includes(item.status)
}

export function isOverdueComplaint(item: Pick<Complaint, 'status' | 'sla_deadline'>, now = Date.now()) {
  return isOpenComplaint(item) && new Date(item.sla_deadline).getTime() < now
}

export function matchesComplaintView(item: FilterableComplaint, view: string, now = Date.now()) {
  switch (view) {
    case 'open': return isOpenComplaint(item)
    case 'active': return ['assigned', 'in_progress', 'waiting_for_materials'].includes(item.status)
    case 'resolved': return ['resolved', 'closed'].includes(item.status)
    case 'overdue': return isOverdueComplaint(item, now)
    case 'review': return ['submitted', 'under_review', 'reopened'].includes(item.status)
    case 'unassigned': return isOpenComplaint(item) && !item.assigned_staff_id
    default: return true
  }
}
