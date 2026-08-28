import { useEffect, useState } from 'react'
import { BellOff, BellRing, LoaderCircle, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { pushNotificationService, type PushNotificationStatus } from '../../services/pushNotificationService'

export function PushNotificationCard() {
  const { user } = useAuth()
  const [status, setStatus] = useState<PushNotificationStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void pushNotificationService.status().then(setStatus).catch(() => setStatus('unsupported'))
  }, [])

  async function enable() {
    if (!user) return
    setBusy(true)
    try {
      await pushNotificationService.enable(user.id)
      setStatus('enabled')
      toast.success('Push notifications enabled on this device.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enable push notifications.'
      setStatus(Notification.permission === 'denied' ? 'denied' : 'disabled')
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      await pushNotificationService.disable()
      setStatus('disabled')
      toast.success('Push notifications disabled on this device.')
    } catch {
      toast.error('Unable to disable push notifications.')
    } finally {
      setBusy(false)
    }
  }

  const enabled = status === 'enabled'
  return <section className={`mt-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${enabled ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
    <div className="flex gap-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${enabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
        {enabled ? <BellRing size={22}/> : status === 'denied' ? <BellOff size={22}/> : <Smartphone size={22}/>}
      </span>
      <div>
        <h2 className="font-bold">Push notifications on this device</h2>
        <p className="mt-1 text-sm text-slate-600">
          {status === null && 'Checking browser notification settings…'}
          {status === 'enabled' && 'Enabled. Complaint and reply alerts can appear even when this website is closed.'}
          {status === 'disabled' && 'Enable alerts so new complaints, assignments, questions, and replies are noticed immediately.'}
          {status === 'denied' && 'Notifications are blocked. Allow them in this browser’s site settings, then reload this page.'}
          {status === 'unsupported' && 'This browser does not support web push here. On iPhone, add the site to the Home Screen first.'}
        </p>
        {status !== 'unsupported' && <p className="mt-1 text-xs text-slate-500">Alert sound and vibration follow this device’s notification and silent-mode settings.</p>}
      </div>
    </div>
    {status && status !== 'unsupported' && status !== 'denied' && <button type="button" className={enabled ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'} disabled={busy} onClick={() => void (enabled ? disable() : enable())}>
      {busy && <LoaderCircle className="animate-spin" size={17}/>}
      {busy ? 'Please wait' : enabled ? 'Disable on this device' : 'Enable push alerts'}
    </button>}
  </section>
}
