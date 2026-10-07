import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowRight, Building2, CheckCircle2, ClipboardList, Clock3, RefreshCw, ShieldCheck, Users, Wrench, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '../../components/common/Badge'
import { LoadingScreen } from '../../components/common/States'
import { useRealtime } from '../../hooks/useRealtime'
import { adminDashboardService, type DashboardActivity, type DashboardComplaint, type DashboardStaff, type DashboardUser } from '../../services/adminDashboardService'
import { isOpenComplaint, isOverdueComplaint, matchesComplaintView } from '../../utils/complaintFilters'
import { formatDate, humanize, slaText } from '../../utils/format'

type DashboardData = {
  complaints: DashboardComplaint[] | null
  staff: DashboardStaff[] | null
  usersToday: DashboardUser[] | null
  usersTodayCount: number | null
  pendingAccounts: number | null
  activity: DashboardActivity[] | null
}

async function rows<T>(request: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error || data === null) throw error || new Error('No data returned')
  return data as T
}

const complaintUrl = (params: Record<string, string>) => `/admin/complaints?${new URLSearchParams(params)}`
const detailUrl = (id: string) => `/admin/complaints/${id}`
const locationLabel = (location: DashboardComplaint['location']) => location
  ? [location.building, location.floor, location.room].filter(Boolean).join(' · ')
  : 'Location not specified'

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>({ complaints: null, staff: null, usersToday: null, usersTodayCount: null, pendingAccounts: null, activity: null })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(Date.now())
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    try {
      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      const nextDay = new Date(dayStart)
      nextDay.setDate(nextDay.getDate() + 1)
      const [complaints, staff, usersToday, usersTodayCount, pendingAccounts, activity] = await Promise.allSettled([
        rows<DashboardComplaint[]>(adminDashboardService.complaints()),
        rows<DashboardStaff[]>(adminDashboardService.staff()),
        rows<DashboardUser[]>(adminDashboardService.newUsers(dayStart.toISOString(), nextDay.toISOString())),
        (async () => {
          const { count, error } = await adminDashboardService.newUsersCount(dayStart.toISOString(), nextDay.toISOString())
          if (error || count === null) throw error || new Error('New user count unavailable')
          return count
        })(),
        (async () => {
          const { count, error } = await adminDashboardService.pendingAccounts()
          if (error || count === null) throw error || new Error('Account count unavailable')
          return count
        })(),
        rows<DashboardActivity[]>(adminDashboardService.activity()),
      ])
      const failed = [
        complaints.status === 'rejected' ? 'complaints' : '',
        staff.status === 'rejected' ? 'maintenance staff' : '',
        usersToday.status === 'rejected' ? 'new users' : '',
        usersTodayCount.status === 'rejected' ? 'new user count' : '',
        pendingAccounts.status === 'rejected' ? 'pending approvals' : '',
        activity.status === 'rejected' ? 'recent activity' : '',
      ].filter(Boolean)
      setData(previous => ({
        complaints: complaints.status === 'fulfilled' ? complaints.value : previous.complaints,
        staff: staff.status === 'fulfilled' ? staff.value : previous.staff,
        usersToday: usersToday.status === 'fulfilled' ? usersToday.value : previous.usersToday,
        usersTodayCount: usersTodayCount.status === 'fulfilled' ? usersTodayCount.value : previous.usersTodayCount,
        pendingAccounts: pendingAccounts.status === 'fulfilled' ? pendingAccounts.value : previous.pendingAccounts,
        activity: activity.status === 'fulfilled' ? activity.value : previous.activity,
      }))
      setErrors(failed)
      setNow(Date.now())
      if (!failed.length) setUpdatedAt(new Date())
    } finally {
      inFlight.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const refresh = () => { if (!document.hidden) void load() }
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [load])
  useRealtime('complaints', load)
  useRealtime('complaint_status_history', load)

  const summary = useMemo(() => {
    const items = data.complaints || []
    const open = items.filter(isOpenComplaint)
    const overdue = open.filter(item => isOverdueComplaint(item, now))
    const review = items.filter(item => matchesComplaintView(item, 'review', now))
    const unassigned = open.filter(item => !item.assigned_staff_id)
    const attention = open.filter(item => isOverdueComplaint(item, now) || matchesComplaintView(item, 'review', now) || !item.assigned_staff_id)
      .sort((a, b) => Number(isOverdueComplaint(b, now)) - Number(isOverdueComplaint(a, now))
        || ({ emergency: 0, high: 1, medium: 2, low: 3 }[a.priority] - { emergency: 0, high: 1, medium: 2, low: 3 }[b.priority])
        || new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    const workloads = (data.staff || []).map(staff => {
      const tasks = open.filter(item => item.assigned_staff_id === staff.id)
      return { ...staff, active: tasks.length, overdue: tasks.filter(item => isOverdueComplaint(item, now)).length }
    }).sort((a, b) => b.overdue - a.overdue || b.active - a.active || a.full_name.localeCompare(b.full_name))
    const locations = new Map<string, { id: string; label: string; total: number; overdue: number }>()
    for (const item of open) {
      if (!item.location_id || !item.location) continue
      const entry = locations.get(item.location_id) || { id: item.location_id, label: locationLabel(item.location), total: 0, overdue: 0 }
      entry.total += 1
      if (isOverdueComplaint(item, now)) entry.overdue += 1
      locations.set(entry.id, entry)
    }
    return {
      total: items.length,
      active: items.filter(item => matchesComplaintView(item, 'active', now)).length,
      resolved: items.filter(item => matchesComplaintView(item, 'resolved', now)).length,
      overdue, review, unassigned, attention, workloads,
      locations: [...locations.values()].sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.label.localeCompare(b.label)).slice(0, 5),
    }
  }, [data.complaints, data.staff, now])

  if (loading) return <LoadingScreen/>
  const count = (value: number) => data.complaints === null ? '—' : value

  return <div className="space-y-6 pb-4">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-700">Administration / Overview</p>
        <h1 className="display mt-2 text-4xl text-slate-900">Campus at a glance</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Keep reports moving, support your team, and see where the campus needs attention.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500" role="status">{errors.length ? 'Some data could not be refreshed' : updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : 'Awaiting update'}</p>
        <button type="button" onClick={() => void load()} disabled={refreshing} className="btn-secondary"><RefreshCw size={15} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''}/>{refreshing ? 'Refreshing' : 'Refresh'}</button>
      </div>
    </div>

    {errors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">Unable to refresh {errors.join(', ')}. Previously loaded values, if available, remain visible. Use Refresh to try again.</div>}

    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
      <SummaryCard label="Total complaints" value={count(summary.total)} detail="All facility reports" to="/admin/complaints" icon={ClipboardList}/>
      <SummaryCard label="Active work" value={count(summary.active)} detail="Assigned, in progress, or waiting" to={complaintUrl({ view: 'active' })} icon={Wrench} tone="gold"/>
      <SummaryCard label="Resolved" value={count(summary.resolved)} detail="Resolved and closed reports" to={complaintUrl({ view: 'resolved' })} icon={CheckCircle2} tone="green"/>
      <SummaryCard label="Overdue" value={count(summary.overdue.length)} detail="Open reports past their deadline" to={complaintUrl({ view: 'overdue' })} icon={AlertTriangle} tone={summary.overdue.length ? 'red' : 'neutral'}/>
      <SummaryCard label="New users today" value={data.usersTodayCount ?? '—'} detail="Accounts registered today" to="/admin/users" icon={Users}/>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section className="card min-w-0 overflow-hidden">
        <div className="border-b bg-gradient-to-r from-amber-50/80 to-white px-5 py-5 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-forest-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>Start here</div>
          <h2 className="text-lg font-bold text-slate-900">Needs your attention</h2>
          <p className="mt-1 text-sm text-slate-500">Review new reports and keep the next step clear.</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <AttentionLink label="Needs review" value={count(summary.review.length)} note="New, under review, or reopened" to={complaintUrl({ view: 'review' })} icon={ClipboardList}/>
          <AttentionLink label="Needs assignment" value={count(summary.unassigned.length)} note="Open reports without a technician" to={complaintUrl({ view: 'unassigned' })} icon={Wrench}/>
          <AttentionLink label="Overdue reports" value={count(summary.overdue.length)} note="Follow up on missed deadlines" to={complaintUrl({ view: 'overdue' })} icon={Clock3} danger={summary.overdue.length > 0}/>
          <AttentionLink label="Account approvals" value={data.pendingAccounts ?? '—'} note="Teacher and staff registrations" to="/admin/users?verification=pending" icon={ShieldCheck}/>
        </div>
        <div className="border-t px-5 py-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Suggested next reports</h3><span className="text-xs text-slate-500">Overdue first, then priority and age</span></div>
          {data.complaints === null ? <Unavailable/> : summary.attention.length === 0 ? <QuietState title="Your report queue is clear" message="No reports need review, assignment, or overdue follow-up."/> : <div className="divide-y">
            {summary.attention.slice(0, 3).map(item => <Link key={item.id} to={detailUrl(item.id)} className="group flex items-center gap-3 rounded-lg py-3 focus-visible:ring-inset">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isOverdueComplaint(item, now) ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}><ArrowRight size={16}/></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 group-hover:text-forest-700">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{item.complaint_number} · {locationLabel(item.location)}</p></div>
              <span className={`shrink-0 text-xs font-semibold ${isOverdueComplaint(item, now) ? 'text-red-600' : 'text-forest-700'}`}>{isOverdueComplaint(item, now) ? 'Follow up' : matchesComplaintView(item, 'review') ? 'Review' : 'Assign'}</span>
            </Link>)}
          </div>}
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <PanelHeading title="Maintenance workload" subtitle="Open assignments per technician." action={<Link to="/admin/users?role=technician" aria-label="Manage maintenance team" className="btn-icon"><Users size={19}/></Link>}/>
        {data.staff === null || data.complaints === null ? <Unavailable/> : summary.workloads.length === 0 ? <QuietState title="No technicians yet" message="Assign the technician role to a verified staff account in Users & staff."/> : <div className="max-h-[430px] overflow-y-auto px-5 sm:px-6">
          {summary.workloads.map(staff => <Link to={complaintUrl({ view: 'open', staff: staff.id })} key={staff.id} className="group flex items-center gap-3 border-b py-4 last:border-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-50 text-sm font-bold text-forest-700">{staff.full_name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold group-hover:text-forest-700">{staff.full_name}</p><p className="mt-1 truncate text-xs text-slate-500">{staff.specialization || 'General maintenance'}</p>{(staff.account_status !== 'active' || staff.verification_status !== 'approved') && <span className="mt-1 block text-xs font-medium text-amber-800">Unavailable for new assignments</span>}</div>
            <div className="shrink-0 text-right"><p className="text-sm font-bold text-slate-900">{staff.active} <span className="font-normal text-slate-500">open</span></p><p className={`mt-1 text-xs ${staff.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{staff.overdue ? `${staff.overdue} overdue` : staff.active ? 'No overdue tasks' : 'No open tasks'}</p></div>
          </Link>)}
        </div>}
        <div className="border-t bg-slate-50/70 px-5 py-3 sm:px-6"><Link to={complaintUrl({ view: 'unassigned' })} className="inline-flex items-center gap-2 text-xs font-semibold text-forest-700">View reports needing assignment<ArrowRight size={14}/></Link></div>
      </section>
    </div>

    <section className="card min-w-0 overflow-hidden">
      <PanelHeading title="Recent complaints" subtitle="The latest facility reports across campus." action={<Link className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-forest-700" to="/admin/complaints">View all<ArrowRight size={15}/></Link>}/>
      {data.complaints === null ? <Unavailable/> : data.complaints.length === 0 ? <QuietState title="No complaints yet" message="New facility reports will appear here as they arrive."/> : <>
        <div className="divide-y border-t md:hidden">{data.complaints.slice(0, 5).map(item => <Link key={item.id} to={detailUrl(item.id)} className="block px-5 py-4 hover:bg-slate-50">
          <p className="text-xs text-slate-500">{item.complaint_number}</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">{item.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{locationLabel(item.location)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><PriorityBadge priority={item.priority}/><StatusBadge status={item.status}/></div>
          <p className={`mt-2 text-xs ${isOverdueComplaint(item, now) ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{item.status === 'rejected' ? 'Deadline not applicable' : slaText(item.sla_deadline, item.status)}</p>
        </Link>)}</div>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-y bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th scope="col" className="px-6 py-3 font-semibold">Report / Location</th><th scope="col" className="px-3 font-semibold">Priority</th><th scope="col" className="px-3 font-semibold">Status</th><th scope="col" className="px-6 font-semibold">Deadline</th></tr></thead>
          <tbody>{data.complaints.slice(0, 5).map(item => <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/70">
            <td className="max-w-[380px] px-6 py-4"><Link to={detailUrl(item.id)} className="block truncate font-semibold text-slate-900 hover:text-forest-700 hover:underline">{item.title}<span className="sr-only"> — {item.complaint_number}</span></Link><p className="mt-1 truncate text-xs text-slate-500">{item.complaint_number} · {locationLabel(item.location)}</p></td>
            <td className="px-3"><PriorityBadge priority={item.priority}/></td><td className="whitespace-nowrap px-3"><StatusBadge status={item.status}/></td>
            <td className={`whitespace-nowrap px-6 text-xs ${isOverdueComplaint(item, now) ? 'font-semibold text-red-600' : 'text-slate-500'}`}><span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>{item.status === 'rejected' ? 'Not applicable' : slaText(item.sla_deadline, item.status)}</span></td>
          </tr>)}</tbody>
        </table>
        </div>
      </>}
    </section>

    <section className="card min-w-0 overflow-hidden">
      <PanelHeading title="New users today" subtitle="Accounts registered since local midnight." action={<div className="flex shrink-0 items-center gap-3"><span className="rounded-md bg-forest-50 px-2.5 py-1 text-sm font-bold text-forest-700" aria-label={`${data.usersTodayCount ?? 'Loading'} users registered today`}>{data.usersTodayCount ?? '—'} today</span><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700" to="/admin/users">View all<ArrowRight size={15}/></Link></div>}/>
      {data.usersToday === null ? <Unavailable/> : data.usersToday.length === 0 ? <QuietState title="No new users today" message="New registrations will appear here."/> : <ol className="divide-y px-5 sm:px-6">
        {data.usersToday.map(user => <li key={user.id} className="flex items-center gap-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">{user.full_name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{user.full_name}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email || 'Email unavailable'} · {humanize(user.account_type)}</p></div>
          <div className="shrink-0 text-right"><span className={`text-xs font-semibold ${user.verification_status === 'approved' ? 'text-green-700' : user.verification_status === 'rejected' ? 'text-red-600' : 'text-amber-800'}`}>{humanize(user.verification_status)}</span><time dateTime={user.created_at} className="mt-1 block text-xs text-slate-500">{new Date(user.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</time></div>
        </li>)}
      </ol>}
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="card min-w-0 overflow-hidden">
        <PanelHeading title="Locations needing attention" subtitle="Top five locations by open facility reports." action={<Building2 size={20} className="text-slate-400"/>}/>
        {data.complaints === null ? <Unavailable/> : summary.locations.length === 0 ? <QuietState title="No locations to highlight" message="Open reports with a recorded location will appear here."/> : <div className="space-y-4 px-5 pb-5 sm:px-6">
          {summary.locations.map(location => <Link key={location.id} to={complaintUrl({ view: 'open', location: location.id })} className="group block rounded-lg">
            <div className="flex items-start justify-between gap-3"><p className="min-w-0 text-sm font-semibold group-hover:text-forest-700">{location.label}</p><span className="shrink-0 text-sm font-bold">{location.total} <span className="font-normal text-slate-500">open</span></span></div>
            <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-forest-700" style={{ width: `${location.total / summary.locations[0].total * 100}%` }}/></div>
            {location.overdue > 0 && <p className="mt-1.5 text-xs font-medium text-red-600">{location.overdue} overdue</p>}
          </Link>)}
        </div>}
      </section>

      <section className="card min-w-0 overflow-hidden">
        <PanelHeading title="Recent complaint activity" subtitle="The latest recorded workflow updates." action={<Clock3 size={20} className="text-slate-400"/>}/>
        {data.activity === null ? <Unavailable/> : data.activity.length === 0 ? <QuietState title="No activity yet" message="Submissions and status changes will appear here."/> : <ol className="space-y-4 px-5 pb-5 sm:px-6">
          {data.activity.map(event => <li key={event.id} className="flex gap-3"><span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${['resolved', 'closed'].includes(event.new_status) ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{['resolved', 'closed'].includes(event.new_status) ? <CheckCircle2 size={14}/> : <ArrowDownLeft size={14}/>}</span><div className="min-w-0 flex-1"><p className="text-sm"><Link to={detailUrl(event.complaint_id)} className="font-semibold text-forest-700 hover:underline">{event.complaint?.complaint_number || 'View complaint'}</Link><span className="text-slate-600"> · {humanize(event.new_status)}</span></p><p className="mt-0.5 truncate text-xs text-slate-500">{event.complaint?.title || 'Facility complaint'}</p><time dateTime={event.created_at} className="mt-1 block text-xs text-slate-500">{formatDate(event.created_at)}</time></div></li>)}
        </ol>}
      </section>
    </div>
  </div>
}

function SummaryCard({ label, value, detail, to, icon: Icon, tone = 'neutral' }: { label: string; value: number | string; detail: string; to: string; icon: LucideIcon; tone?: 'neutral' | 'gold' | 'green' | 'red' }) {
  const tones = { neutral: 'bg-forest-50 text-forest-700', gold: 'bg-amber-50 text-amber-900', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-600' }
  return <Link to={to} className="card group block border-t-[3px] border-t-forest-700 p-4 transition hover:border-forest-200 hover:border-t-forest-700 hover:shadow-md sm:p-5">
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span><span className={`rounded-xl p-2 ${tones[tone]}`}><Icon size={19}/></span></div>
    <p className={`mt-2 text-3xl font-bold tracking-tight ${tone === 'red' ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs leading-5 text-slate-500">{detail}</span><ArrowRight size={15} className="shrink-0 text-slate-400 transition group-hover:text-forest-700"/></div>
  </Link>
}

function AttentionLink({ label, value, note, to, icon: Icon, danger = false }: { label: string; value: number | string; note: string; to: string; icon: LucideIcon; danger?: boolean }) {
  return <Link to={to} className={`group rounded-xl border p-3.5 transition ${danger ? 'border-red-100 bg-red-50/50 hover:bg-red-50' : 'border-slate-200 bg-white hover:border-forest-200 hover:bg-forest-50/30'}`}><div className="flex items-center gap-2"><Icon size={16} className={danger ? 'text-red-600' : 'text-forest-700'}/><span className="flex-1 text-sm font-semibold">{label}</span><span className={`text-xl font-bold ${danger ? 'text-red-600' : 'text-slate-900'}`}>{value}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></Link>
}

function PanelHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p></div>{action}</div>
}

function QuietState({ title, message }: { title: string; message: string }) {
  return <div className="px-5 py-7 text-center"><p className="text-sm font-semibold text-slate-700">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-slate-500">{message}</p></div>
}

function Unavailable() {
  return <p className="px-5 py-7 text-center text-sm text-slate-500">This section is unavailable. Try Refresh.</p>
}
