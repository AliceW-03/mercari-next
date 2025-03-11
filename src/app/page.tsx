'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser, sendNotification } from './actions'
import { ErudaDebug } from '@/components/ErudaDebug'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  )
  const [message, setMessage] = useState('')
  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    console.log('VAPID Key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)

    // 检查浏览器是否支持推送通知
    const checkSupport = () => {
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        setBrowserSupported(false);
        return false;
      }

      if (!('PushManager' in window)) {
        console.log('Push notifications not supported');
        setBrowserSupported(false);
        return false;
      }

      if (
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window.navigator as any).standalone
      ) {
        console.log('iOS device detected - push notifications may not work');
      }

      return true;
    };

    if (checkSupport()) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Disable SW cache for the SW script itself
      });

      // Add update found handler
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (confirm('新版本已可用。是否刷新页面以更新？')) {
                window.location.reload();
              }
            }
          });
        }
      });

      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async function subscribeToPush() {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    })
    setSubscription(sub)
    const serializedSub = JSON.parse(JSON.stringify(sub))
    await subscribeUser(serializedSub)
  }

  async function unsubscribeFromPush() {
    if (subscription) {
      await subscription.unsubscribe()
      await unsubscribeUser(subscription.endpoint)
      setSubscription(null)
    }
  }

  async function sendTestNotification() {
    try {
      console.log('Current subscription:', subscription);

      if (!subscription) {
        console.error('No subscription available');
        return;
      }

      const result = await sendNotification(message);
      if (result.success) {
        setMessage('');
      } else {
        console.error('Failed to send notification:', result.error);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  if (!browserSupported) {
    return <p>您的浏览器不支持推送通知功能。如果您使用的是 iOS 设备，请注意 iOS 的 Safari 浏览器对 Web Push 支持有限。</p>;
  }

  return (
    <div>
      <h3>Push Notifications</h3>
      {subscription ? (
        <>
          <p>You are subscribed to push notifications.</p>
          <button onClick={unsubscribeFromPush}>Unsubscribe</button>
          <input
            type="text"
            placeholder="Enter notification message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={sendTestNotification}>Send Test</button>
        </>
      ) : (
        <>
          <p>You are not subscribed to push notifications.</p>
          <button onClick={subscribeToPush}>Subscribe</button>
        </>
      )}
    </div>
  )
}

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    )

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  if (isStandalone) {
    return null // Don't show install button if already installed
  }

  return (
    <div>
      <h3>Install App</h3>
      <button>Add to Home Screen</button>
      {isIOS && (
        <p>
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon">
            {' '}
            ⎋{' '}
          </span>
          and then &quot;Add to Home Screen&quot;
          <span role="img" aria-label="plus icon">
            {' '}
            ➕{' '}
          </span>.
        </p>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <div>
      <ErudaDebug />
      <PushNotificationManager />
      <InstallPrompt />
    </div>
  )
}