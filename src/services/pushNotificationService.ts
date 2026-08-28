import { supabase } from '../lib/supabase'

const publicVapidKey = 'BKJ8oJOdzSM4n8b9dKgNRyB94zE0kAFxagkDntYpWBFg5bzsYyuK1C22kCoCFj8ZlTqEnLtkadpQnuZ5g-Fo0Z4'

export type PushNotificationStatus = 'unsupported' | 'denied' | 'disabled' | 'enabled'

function supported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0))
}

async function registration() {
  return navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
}

async function saveSubscription(userId: string, subscription: PushSubscription) {
  const value = subscription.toJSON()
  if (!value.endpoint || !value.keys?.p256dh || !value.keys.auth) throw new Error('The browser returned an incomplete push subscription.')
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: value.endpoint,
    p256dh: value.keys.p256dh,
    auth: value.keys.auth,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

export const pushNotificationService = {
  async status(): Promise<PushNotificationStatus> {
    if (!supported()) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'
    const current = await (await registration()).pushManager.getSubscription()
    return current ? 'enabled' : 'disabled'
  },

  async enable(userId: string) {
    if (!supported()) throw new Error('Push notifications are not supported by this browser.')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Notification permission was not granted.')
    const worker = await registration()
    const existing = await worker.pushManager.getSubscription()
    const subscription = existing || await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(publicVapidKey),
    })
    await saveSubscription(userId, subscription)
  },

  async syncExisting(userId: string) {
    if (!supported() || Notification.permission !== 'granted') return
    const current = await (await registration()).pushManager.getSubscription()
    if (current) await saveSubscription(userId, current)
  },

  async disable() {
    if (!supported()) return
    const current = await (await registration()).pushManager.getSubscription()
    if (!current) return
    await supabase.from('push_subscriptions').delete().eq('endpoint', current.endpoint)
    await current.unsubscribe()
  },
}
