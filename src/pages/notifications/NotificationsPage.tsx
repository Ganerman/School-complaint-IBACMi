import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notificationService } from '../../services/notificationService'
import type { AppNotification } from '../../types'
import { EmptyState, ErrorState, LoadingScreen } from '../../components/common/States'
import { formatDate } from '../../utils/format'
import { useRealtime } from '../../hooks/useRealtime'
import { useAuth } from '../../hooks/useAuth'
import { PushNotificationCard } from '../../components/notifications/PushNotificationCard'

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { profile } = useAuth()

  const load = useCallback(async () => {
    const { data, error: loadError } = await notificationService.list()
    setError(loadError ? 'Unable to load notifications. Please try again.' : '')
    setItems((data || []) as AppNotification[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])
  useRealtime('notifications', load)

  async function read(notification: AppNotification) {
    if (!notification.is_read) await notificationService.markRead(notification.id)
    if (notification.reference_id && profile) {
      const section = notification.notification_type?.startsWith('academic_') ? 'academic-concerns' : 'complaints'
      navigate(`/${profile.role}/${section}/${notification.reference_id}`)
    } else void load()
  }

  if (loading) return <LoadingScreen />
  const hasUnread = items.some(item => !item.is_read)

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="display text-4xl">Notifications</h1><p className="mt-2 text-slate-500">Updates about your complaints and assignments.</p></div>
      <button className="btn-secondary" disabled={!hasUnread} onClick={async()=>{await notificationService.markAllRead();void load()}}><CheckCheck size={18}/>Mark all read</button>
    </div>
    <PushNotificationCard/>
    {error && <div className="mt-6"><ErrorState message={error}/></div>}
    <div className="mt-7 space-y-3">{items.length===0
      ? <EmptyState title="You're all caught up" message="New updates will appear here."/>
      : items.map(notification=><button key={notification.id} onClick={()=>read(notification)} className={`card flex w-full gap-4 p-4 text-left transition hover:border-forest-200 hover:shadow-md ${notification.is_read?'opacity-65':'border-forest-100 bg-forest-50/30'}`}>
          <span className="rounded-xl bg-white p-2 text-forest-700"><Bell size={19}/></span>
          <span className="flex-1"><b className="text-sm">{notification.title}</b><p className="mt-1 text-sm text-slate-500">{notification.message}</p><small className="mt-2 block text-slate-400">{formatDate(notification.created_at)}</small></span>
          {!notification.is_read&&<i aria-label="Unread" className="mt-2 h-2 w-2 rounded-full bg-amber-400"/>}
        </button>)}</div>
  </div>
}
