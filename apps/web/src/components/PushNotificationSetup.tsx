'use client'

import { useEffect, useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const STORAGE_KEY = 'notif-banner-dismissed'

export default function PushNotificationSetup() {
  const { permission, requestPermission } = usePushNotifications()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (permission !== 'default') return
    const alreadyDismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    if (!alreadyDismissed) setVisible(true)
  }, [permission])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  const handleActivate = async () => {
    await requestPermission()
    dismiss()
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center gap-3 max-w-sm w-full">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Activer les notifications</p>
          <p className="text-xs text-gray-500">Reçois les alertes de ta famille</p>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 px-1">✕</button>
        <button
          onClick={handleActivate}
          className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          Activer
        </button>
      </div>
    </div>
  )
}
