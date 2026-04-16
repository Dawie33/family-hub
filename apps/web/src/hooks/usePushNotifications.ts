'use client'

import { useEffect, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/lib/firebase'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

// Quand un service worker est actif, new Notification() est bloqué par Chrome.
// Il faut passer par serviceWorker.showNotification() à la place.
async function showNotification(title: string, body?: string) {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, { body, icon: '/icon-192x192.png' })
  } else {
    new Notification(title, { body, icon: '/icon-192x192.png' })
  }
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission)

    // Si permission déjà accordée, réenregistre le listener onMessage au rechargement
    if (Notification.permission === 'granted' && VAPID_KEY) {
      const messaging = getFirebaseMessaging()
      if (!messaging) return
      const unsubscribe = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {}
        if (title) showNotification(title, body).catch(() => {})
      })
      return unsubscribe
    }
  }, [])

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return

      const messaging = getFirebaseMessaging()
      if (!messaging || !VAPID_KEY) return

      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY })
      if (!fcmToken) return

      setToken(fcmToken)
      await saveTokenToServer(fcmToken)

      // Écoute les messages reçus quand l'app est au premier plan
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {}
        if (title) showNotification(title, body).catch(() => {})
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return { permission, token, error, requestPermission }
}

async function saveTokenToServer(fcmToken: string) {
  await fetch('/api/notifications/save-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: fcmToken }),
  })
}
