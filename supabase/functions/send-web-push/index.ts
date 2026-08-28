import { createClient } from 'npm:@supabase/supabase-js@2.52.1'
import webpush from 'npm:web-push@3.6.7'

interface NotificationRecord {
  id: string
  user_id: string
}

interface WebhookPayload {
  type?: string
  table?: string
  record?: NotificationRecord
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const payload = await request.json() as WebhookPayload
    const notificationId = payload.record?.id
    if (payload.type !== 'INSERT' || payload.table !== 'notifications' || !notificationId) {
      return json({ error: 'Invalid notification webhook payload' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const publicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY')
    const privateKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY')
    const subject = Deno.env.get('WEB_PUSH_SUBJECT')
    if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !subject) {
      return json({ error: 'Push notification secrets are incomplete' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .select('id,user_id,title,message,notification_type,reference_id')
      .eq('id', notificationId)
      .single()
    if (notificationError || !notification) return json({ error: 'Notification not found' }, 404)

    const { data: profile } = await admin.from('profiles').select('role').eq('id', notification.user_id).single()
    const { data: subscriptions, error: subscriptionError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', notification.user_id)
    if (subscriptionError) return json({ error: 'Unable to load push subscriptions' }, 500)
    if (!subscriptions?.length) return json({ delivered: 0 })

    webpush.setVapidDetails(subject, publicKey, privateKey)
    const section = notification.notification_type?.startsWith('academic_') ? 'academic-concerns' : 'complaints'
    const url = notification.reference_id && profile?.role
      ? `/${profile.role}/${section}/${notification.reference_id}`
      : profile?.role ? `/${profile.role}/notifications` : '/portal'
    const message = JSON.stringify({
      title: notification.title,
      body: notification.message,
      notificationId: notification.id,
      url,
    })

    let delivered = 0
    await Promise.all(subscriptions.map(async subscription => {
      const { error: claimError } = await admin.from('push_deliveries').insert({
        notification_id: notification.id,
        subscription_id: subscription.id,
      })
      if (claimError) return

      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, message, { TTL: 300, urgency: 'high' })
        delivered += 1
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode || 0)
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
        } else {
          await admin.from('push_deliveries').delete()
            .eq('notification_id', notification.id)
            .eq('subscription_id', subscription.id)
          console.error('Push delivery failed', statusCode || error)
        }
      }
    }))

    return json({ delivered })
  } catch (error) {
    console.error('Push webhook failed', error)
    return json({ error: 'Unable to process push notification' }, 500)
  }
})
