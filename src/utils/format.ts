import { formatDistanceToNow, isPast } from 'date-fns'
import type { ComplaintPriority, ComplaintStatus } from '../types'

export const humanize = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

export function slaText(deadline: string, status: ComplaintStatus) {
  if (['resolved', 'closed', 'rejected'].includes(status)) return 'Completed'
  const overdue = isPast(new Date(deadline))
  return `${overdue ? 'Overdue by' : 'Due in'} ${formatDistanceToNow(new Date(deadline))}`
}

export const statusTone: Record<ComplaintStatus, string> = {
  submitted: 'bg-forest-50 text-forest-700', under_review: 'bg-amber-50 text-forest-800',
  verified: 'bg-forest-100 text-forest-800', assigned: 'bg-amber-100 text-forest-900',
  in_progress: 'bg-amber-50 text-forest-800', waiting_for_materials: 'bg-amber-100 text-forest-900',
  resolved: 'bg-forest-50 text-forest-700', closed: 'bg-slate-100 text-slate-700',
  rejected: 'bg-red-50 text-red-700', reopened: 'bg-forest-100 text-forest-800',
}
export const priorityTone: Record<ComplaintPriority, string> = {
  low: 'bg-slate-100 text-slate-600', medium: 'bg-forest-50 text-forest-700',
  high: 'bg-amber-100 text-forest-900', emergency: 'bg-red-50 text-red-700',
}
