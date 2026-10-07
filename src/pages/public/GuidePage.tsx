import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bell, BookOpen, Check, CheckCircle2, ChevronDown, ClipboardCheck, FilePlus2, GraduationCap, Lightbulb, MailCheck, ShieldCheck, Star, UserPlus, Users, Wrench, type LucideIcon } from 'lucide-react'

type GuideStep = {
  label: string
  title: string
  icon: LucideIcon
  description: string
  instructions: string[]
  result: string
  tip: string
}

const guides: { id: string; label: string; icon: LucideIcon; introduction: string; steps: GuideStep[] }[] = [
  {
    id: 'student', label: 'Students', icon: GraduationCap,
    introduction: 'Start here to report a facility issue and follow it through to repair.',
    steps: [
      {
        label: 'Register', title: 'Create your student account', icon: UserPlus,
        description: 'Use your own school details so the team can identify and follow up on your report.',
        instructions: ['Open the registration page and select Student.', 'Enter your full name, School ID, email, course, and year level.', 'Choose a password and select Create Student Account.'],
        result: 'Check your email for the account confirmation message.',
        tip: 'Already have an account? Sign in with your email or School ID and password.',
      },
      {
        label: 'Verify', title: 'Verify your email and finish your profile', icon: MailCheck,
        description: 'Complete your account setup before sending your first concern.',
        instructions: ['Open the confirmation email and follow its verification link.', 'Return to the system and sign in.', 'If asked, complete your student profile, including your contact number and password.'],
        result: 'Your dashboard is ready and you can submit a facility complaint.',
        tip: 'You can also use Continue with Google on the sign-in page. Complete the student profile when prompted.',
      },
      {
        label: 'Report', title: 'Tell us what needs attention', icon: FilePlus2,
        description: 'A clear report helps the school understand the issue and send the right team.',
        instructions: ['Choose Facility complaint from the sidebar or Submit a complaint on your dashboard.', 'Add a specific title and description, then select the category and location.', 'Attach a photo if available, then submit the complaint.'],
        result: 'Your report receives a complaint number that you can use to find it later.',
        tip: 'For example: “Leaking pipe in the second-floor restroom.” Photos can be JPEG, PNG, or WebP, up to 5 MB.',
      },
      {
        label: 'Track', title: 'Follow the review and repair', icon: Bell,
        description: 'The administrator reviews the complaint and assigns a maintenance team member when it is verified.',
        instructions: ['Open My facility complaints and select your report.', 'Check the current status, assigned staff, repair photos, and status timeline.', 'Open Notifications for updates and check the deadline shown on your report.'],
        result: 'You can see how the concern moves from review to assigned work and resolution.',
        tip: 'Waiting for materials means the repair is on hold. Overdue means an unfinished report has passed its target deadline.',
      },
      {
        label: 'Review', title: 'Review the repair and share feedback', icon: Star,
        description: 'Your feedback helps the school understand whether the concern was addressed.',
        instructions: ['When the report is Resolved or Closed, open its details.', 'Review the repair explanation and after-repair photo, then submit your rating and comments.', 'If the same issue is still not fixed, select Reopen complaint.'],
        result: 'Your feedback is recorded, or the reopened complaint returns for further attention.',
        tip: 'You can submit one feedback entry per complaint. Review your rating and comments before sending them.',
      },
    ],
  },
  {
    id: 'maintenance', label: 'Maintenance', icon: Wrench,
    introduction: 'Use your assigned maintenance account to assess, update, and document repairs.',
    steps: [
      {
        label: 'Sign in', title: 'Open your maintenance portal', icon: Users,
        description: 'Your account must have maintenance access assigned by an administrator.',
        instructions: ['Sign in with your assigned account.', 'Open the dashboard to check your workload.', 'Choose Assigned complaints to view your tasks.'],
        result: 'You see the facility complaints assigned to you.',
        tip: 'If you cannot see your maintenance portal, ask the school administrator to check your account role.',
      },
      {
        label: 'Assess', title: 'Review the assigned concern', icon: ClipboardCheck,
        description: 'Understand the location, evidence, and urgency before starting the repair.',
        instructions: ['Open an assigned complaint.', 'Read the description and check the location and attached photos.', 'Set the complaint priority according to your assessment.'],
        result: 'The report reflects the assessed priority and its corresponding deadline.',
        tip: 'Use the complaint details to keep the repair connected to the original report.',
      },
      {
        label: 'Repair', title: 'Start work and document progress', icon: Wrench,
        description: 'Keep the report updated while the repair is in progress.',
        instructions: ['Select Start work on the complaint.', 'Upload progress photos as you work.', 'If you cannot finish, choose Not resolved and explain the reason before submitting the update.'],
        result: 'The report shows In progress, or Waiting for materials when you submit a Not resolved update.',
        tip: 'Explain any blocker clearly so the administrator knows what support is needed.',
      },
      {
        label: 'Resolve', title: 'Record the completed repair', icon: CheckCircle2,
        description: 'Show what was repaired before marking the complaint as resolved.',
        instructions: ['Upload an after-repair photo.', 'Choose Resolved and describe the completed repair.', 'Select Mark resolved once the photo and explanation are ready.'],
        result: 'The complaint is marked Resolved and becomes available for review and feedback.',
        tip: 'Both the after-repair photo and resolution details are required.',
      },
      {
        label: 'Follow up', title: 'Check for further action', icon: Bell,
        description: 'A reporter may reopen a complaint if the issue remains.',
        instructions: ['Check your notifications and assigned complaint list.', 'Review any reopened complaint assigned to you.', 'Start work again and document the additional repair when needed.'],
        result: 'Further work stays connected to the same complaint history.',
        tip: 'Check the latest timeline entries before responding to a reopened report.',
      },
    ],
  },
  {
    id: 'admin', label: 'Administrators', icon: ShieldCheck,
    introduction: 'Review incoming reports, coordinate the response, and monitor the outcome.',
    steps: [
      {
        label: 'Review', title: 'Review incoming complaints', icon: ClipboardCheck,
        description: 'Check the report details before deciding how the concern should proceed.',
        instructions: ['Sign in with your administrator account and open Facility complaints.', 'Select a submitted complaint and choose Start review.', 'Check the description, location, and supporting photos.'],
        result: 'The complaint moves to Under review.',
        tip: 'Use search and the status filter to find the reports that need attention.',
      },
      {
        label: 'Verify', title: 'Confirm the report can proceed', icon: ShieldCheck,
        description: 'Make the review decision visible in the complaint record.',
        instructions: ['Review the available information.', 'Choose Verify when the complaint is ready for maintenance.', 'If rejecting the report, explain the reason in the notes before choosing Reject.'],
        result: 'A verified complaint is ready for assignment; a rejected report records the review decision.',
        tip: 'Keep explanations clear so the reporter understands the decision.',
      },
      {
        label: 'Assign', title: 'Assign a maintenance team member', icon: Users,
        description: 'Connect the verified concern to the person who will handle the repair.',
        instructions: ['Open the verified complaint.', 'Select an active maintenance staff member from the assignment options.', 'Add useful assignment notes and confirm the assignment.'],
        result: 'The complaint becomes Assigned and appears in the selected staff member’s tasks.',
        tip: 'Choose staff whose specialization fits the reported issue.',
      },
      {
        label: 'Monitor', title: 'Follow progress and blockers', icon: Bell,
        description: 'Use the complaint record and reports to identify work that needs attention.',
        instructions: ['Check status updates, photos, and maintenance notes.', 'Follow up on overdue complaints and repairs waiting for materials.', 'Open Reports & SLA to review workload and resolution performance.'],
        result: 'You have a clear view of ongoing work and delays.',
        tip: 'Overdue is a deadline indicator. It does not replace the complaint’s current workflow status.',
      },
      {
        label: 'Close', title: 'Review the resolution and close the case', icon: CheckCircle2,
        description: 'Check the repair evidence before completing the administrative review.',
        instructions: ['Open a Resolved complaint.', 'Review the resolution details, after-repair photo, and any available feedback.', 'Choose Close when the review is complete.'],
        result: 'The complaint is Closed, with its history retained for reference.',
        tip: 'Reporters can reopen a resolved or closed complaint if the issue remains.',
      },
    ],
  },
]

const questions = [
  ['Where is my confirmation email?', 'Check the inbox and spam or junk folder of the email you used to register. Open the confirmation link, then return to sign in. If it still has not arrived, contact the school administrator.'],
  ['What does overdue mean?', 'An unfinished complaint is overdue when it passes its target repair deadline. You can still follow its current status and updates in the complaint details.'],
  ['How do I report a facility issue?', 'Choose a facility complaint in the sidebar, describe the problem clearly, attach a photo, and monitor the repair progress from the complaint detail screen.'],
  ['Can teachers and school staff report a facility issue?', 'Yes. Choose Teacher or School Staff during registration and enter your employee information. Verify your email and wait for administrator identity approval. Once approved, use Facility complaint to report an issue and My facility complaints to track it.'],
]

export function GuidePage() {
  const [role, setRole] = useState('student')
  const [stepIndex, setStepIndex] = useState(0)
  const guide = guides.find(item => item.id === role)!
  const step = guide.steps[stepIndex]
  const StepIcon = step.icon

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  return <main className="min-h-screen bg-[#fffdf9] px-5 pb-20 pt-32 text-slate-800">
    <div className="mx-auto max-w-6xl">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest-700 hover:underline"><ArrowLeft size={16} aria-hidden="true"/>Back to home</Link>
      <header className="mb-9 mt-5 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-forest-700"><BookOpen size={16} aria-hidden="true"/>Your system guide</span>
        <h1 className="display mt-4 text-4xl leading-tight text-forest-900 sm:text-5xl">Know what to do.<br/>Every step of the way.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">Learn how to use the system, from your first sign-in to a completed repair. Choose your role, then explore each step.</p>
      </header>

      <section aria-label="Interactive system guide" className="overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-7">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose your role">
            {guides.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={role === id} onClick={() => { setRole(id); setStepIndex(0) }} className={role === id ? 'btn-primary' : 'btn-secondary'}><Icon size={17} aria-hidden="true"/>{label}</button>)}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">{guide.introduction}</p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr]">
          <nav aria-label={`${guide.label} guide steps`} className="border-b border-slate-100 bg-[#fcfaf7] p-3 sm:p-5 lg:border-b-0 lg:border-r">
            <ol className="grid grid-cols-5 gap-1 lg:grid-cols-1 lg:gap-3">
              {guide.steps.map((item, index) => <li key={item.label}>
                <button type="button" aria-label={`Step ${index + 1}: ${item.title}`} aria-current={stepIndex === index ? 'step' : undefined} aria-controls="guide-step-content" onClick={() => setStepIndex(index)} className={`flex h-full w-full flex-col items-center gap-2 rounded-xl px-1 py-3 text-center transition lg:flex-row lg:gap-3 lg:px-3 lg:text-left ${stepIndex === index ? 'bg-white text-forest-800 shadow-sm ring-1 ring-forest-100' : 'text-slate-500 hover:bg-white'}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${stepIndex === index ? 'bg-amber-400 text-forest-900' : 'border border-slate-200 bg-white'}`}>{index + 1}</span>
                  <span className="text-[11px] font-semibold sm:text-sm">{item.label}</span>
                  <ArrowRight className="ml-auto hidden lg:block" size={15} aria-hidden="true"/>
                </button>
              </li>)}
            </ol>
          </nav>

          <div className="flex min-w-0 flex-col p-5 sm:p-8">
            <div id="guide-step-content" role="region" aria-label="Selected guide step" aria-live="polite" aria-atomic="true" className="flex-1">
              <div className="flex items-center justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-50 text-forest-700"><StepIcon size={23} aria-hidden="true"/></span><span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step {stepIndex + 1} of {guide.steps.length}</span></div>
              <h2 className="display mt-5 text-3xl text-forest-900">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              <ol className="mt-6 space-y-4">{step.instructions.map((instruction, index) => <li className="flex gap-3 text-sm leading-6" key={instruction}><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{index + 1}</span><span>{instruction}</span></li>)}</ol>
              <div className="mt-6 flex gap-3 rounded-xl border border-forest-100 bg-forest-50/60 p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-forest-700" size={18} aria-hidden="true"/><div><p className="text-xs font-bold uppercase tracking-wider text-forest-700">What happens next</p><p className="mt-1 text-sm leading-6 text-slate-700">{step.result}</p></div></div>
              <p className="mt-4 flex gap-2 text-xs leading-6 text-slate-500"><Lightbulb className="mt-1 shrink-0 text-amber-700" size={16} aria-hidden="true"/><span>{step.tip}</span></p>
            </div>
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button className="btn-secondary" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(index => Math.max(0, index - 1))}><ArrowLeft size={16} aria-hidden="true"/>Previous</button>
              {stepIndex < guide.steps.length - 1 ? <button className="btn-primary" type="button" onClick={() => setStepIndex(index => Math.min(guide.steps.length - 1, index + 1))}>Next step<ArrowRight size={16} aria-hidden="true"/></button> : <Link className="btn-primary" to={role === 'student' ? '/register' : '/login'}>{role === 'student' ? 'Get started' : 'Sign in'}<Check size={16} aria-hidden="true"/></Link>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl" aria-labelledby="guide-questions">
        <h2 id="guide-questions" className="display text-3xl text-forest-900">A few helpful answers</h2>
        <div className="mt-6 divide-y rounded-2xl border bg-white px-5 sm:px-6">{questions.map(([question, answer]) => <details className="group py-1" key={question}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">{question}<ChevronDown className="shrink-0 text-forest-700 group-open:rotate-180" size={17} aria-hidden="true"/></summary><p className="pb-4 text-sm leading-7 text-slate-600">{answer}</p></details>)}</div>
      </section>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-forest-900 p-6 text-white sm:p-8"><div><h2 className="display text-2xl">Ready to make your campus better?</h2><p className="mt-2 text-sm text-white/75">Create an account, or sign in to follow your existing report.</p></div><div className="flex flex-wrap gap-3"><Link to="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-forest-900 hover:bg-amber-300">Create account<ArrowRight size={16} aria-hidden="true"/></Link><Link to="/login" className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Sign in</Link></div></div>
    </div>
  </main>
}
