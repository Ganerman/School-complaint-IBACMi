import type { ComplaintPriority, ComplaintStatus } from '../../types'
import { humanize, priorityTone, statusTone } from '../../utils/format'

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[status]}`}>{humanize(status)}</span>
}
export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[priority]}`}>{humanize(priority)}</span>
}
