import { ArrowRight, UserRound, Wrench } from 'lucide-react'
import type { Complaint, ComplaintStatus, UserRole } from '../../types'
import { StatusBadge } from '../common/Badge'

const guidance: Record<ComplaintStatus, { summary: string; student: string; admin: string; maintenance: string }> = {
  submitted: { summary: 'Your report is waiting for the school office to review it.', student: 'No action needed. Watch for a review update.', admin: 'Start the review using Workflow actions below.', maintenance: 'The school office will review and assign this report.' },
  under_review: { summary: 'The school office is checking the report details.', student: 'No action needed while the school office reviews your report.', admin: 'Check the details and evidence, then verify or reject the report below.', maintenance: 'Wait for the school office to complete its review.' },
  verified: { summary: 'The report has been verified and is ready for assignment.', student: 'The school office will assign a maintenance staff member.', admin: 'Choose a maintenance staff member in Workflow actions below.', maintenance: 'The school office will assign this report to a staff member.' },
  assigned: { summary: 'A maintenance staff member has been assigned to the report.', student: 'Wait for maintenance to start work. Updates will appear in the timeline.', admin: 'Monitor the assignment and follow up with the assigned staff member as needed.', maintenance: 'Assess the priority, then select Start work below when you begin.' },
  in_progress: { summary: 'Maintenance is working on the reported problem.', student: 'No action needed. Watch for repair updates and photo evidence.', admin: 'Monitor repair progress and the deadline.', maintenance: 'Add progress photos. When finished, upload an after-repair photo and describe the repair before marking it resolved.' },
  waiting_for_materials: { summary: 'Repair is on hold. Maintenance has reported a blocker to the school office.', student: 'Wait for a maintenance update. Work can resume once the blocker is addressed.', admin: 'Read the maintenance update below and coordinate the materials or support needed.', maintenance: 'When the blocker is addressed, select Start work below to resume the repair.' },
  resolved: { summary: 'Maintenance has marked the repair complete. The school office can review and close it.', student: 'Check the repair and share your feedback below. Reopen the complaint if the problem remains.', admin: 'Review the repair details and after-repair photos, then close the complaint below.', maintenance: 'The repair is ready for the school office to review. No further action is needed unless it is reopened.' },
  closed: { summary: 'The school office has closed this complaint.', student: 'You can share feedback below if you have not rated the repair, or reopen the complaint if the problem remains.', admin: 'No further action needed. The complaint and evidence remain available for reference.', maintenance: 'No further action needed. This complaint has been closed.' },
  rejected: { summary: 'The school office did not approve this report. Read the reason below.', student: 'Review the rejection reason. Contact the school office if you need clarification.', admin: 'No further action needed. The rejection reason is available below.', maintenance: 'No repair action is needed for this rejected report.' },
  reopened: { summary: 'The reporter has reopened the complaint because the problem needs another check.', student: 'The school office and maintenance team will review the problem again.', admin: 'Review the complaint and confirm or change the maintenance assignment below.', maintenance: 'Check the reported problem again, assess the priority, and select Start work below.' },
}

export function ComplaintProgress({ complaint, role }: { complaint: Complaint; role: UserRole }) {
  const current = guidance[complaint.status]
  return <section aria-label="Complaint progress" className="card mt-6 overflow-hidden">
    <div className="grid gap-5 p-5 sm:grid-cols-2 md:p-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current status</h2>
        <div className="mt-2"><StatusBadge status={complaint.status} /></div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{current.summary}</p>
      </div>
      <div>
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><UserRound size={15} />Assigned maintenance</h2>
        <p className="mt-2 break-words font-semibold text-slate-900">{complaint.assigned_staff?.full_name || (complaint.assigned_staff_id ? 'Staff member assigned' : 'Not assigned yet')}</p>
        <p className="mt-1 text-sm text-slate-500">{complaint.assigned_staff?.specialization || (complaint.assigned_staff_id ? 'Assignment recorded by the school office.' : 'The school office manages maintenance assignments.')}</p>
      </div>
    </div>
    <div className="flex items-start gap-3 border-t border-forest-100 bg-forest-50 px-5 py-4 md:px-6">
      <Wrench size={18} className="mt-0.5 shrink-0 text-forest-700" />
      <div><h3 className="flex items-center gap-2 text-sm font-bold text-forest-900">What happens next <ArrowRight size={15} /></h3><p className="mt-1 text-sm leading-6 text-forest-800">{current[role]}</p></div>
    </div>
  </section>
}
