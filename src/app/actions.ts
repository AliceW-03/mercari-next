"use server"

import webpush, { PushSubscription } from "web-push"
import { PrismaClient } from "@prisma/client"
import { HttpsProxyAgent } from "https-proxy-agent"
import { RequestOptions } from "web-push"
import http from "http"

interface DBPushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  createdAt: Date
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["query", "error", "warn"], // 添加日志以便调试
})

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface WebPushError extends Error {
  statusCode?: number
  endpoint?: string
}

export async function subscribeUser(subscription: PushSubscription) {
  try {
    const { endpoint, keys } = subscription
    await prisma.pushSubscription.create({
      data: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Subscribe error:", error)
    return { success: false, error: "Failed to subscribe user" }
  }
}

export async function unsubscribeUser(endpoint: string) {
  try {
    await prisma.pushSubscription.delete({
      where: {
        endpoint: endpoint,
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Unsubscribe error:", error)
    return { success: false, error: "Failed to unsubscribe user" }
  }
}

async function sendNotificationWithRetry(
  subscription: PushSubscription,
  payload: string,
  retries = 3
) {
  
  const options: RequestOptions = {
    timeout: 30000,
    // proxy: "http://127.0.0.1:7890",
    // agent: proxyAgent,
    TTL: 60 * 60,
    // rejectUnauthorized: false, // 仅在开发环境使用
  }

  for (let i = 0; i < retries; i++) {
    try {
      await webpush.sendNotification(subscription, payload, options)
      return true
    } catch (err) {
      const error = err as WebPushError
      if (i === retries - 1) throw error
      console.log(
        `Retry ${i + 1}/${retries} for endpoint: ${subscription.endpoint}`
      )
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))) // 递增延迟
    }
  }
  return false
}

export async function sendNotification(message: string) {
  try {
    console.log("Starting notification send...")
    const subscriptions = await prisma.pushSubscription.findMany()
    console.log("Found subscriptions:", subscriptions.length)

    if (subscriptions.length === 0) {
      throw new Error("No subscriptions available")
    }

    const payload = JSON.stringify({
      title: "Push Notification",
      body: message,
      // icon: "/icons/72.png",
      // image:
      //   "https://static.mercdn.net/item/detail/webp/photos/m53658219971_1.jpg?1722428919",
    })
    console.log("Prepared payload:", payload)

    console.log("Sending notification to", subscriptions.length, "subscribers")

    const results = await Promise.allSettled(
      subscriptions.map((sub: DBPushSubscription) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }
        return sendNotificationWithRetry(pushSubscription, payload)
      })
    )

    const errors = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      )
      .map((result) => result.reason)

    if (errors.length > 0) {
      console.error("Some notifications failed:", errors)
      for (const error of errors) {
        const webPushError = error as WebPushError
        if (webPushError.statusCode === 410 && webPushError.endpoint) {
          await prisma.pushSubscription.delete({
            where: { endpoint: webPushError.endpoint },
          })
          console.log(`Removed expired subscription: ${webPushError.endpoint}`)
        }
      }
    }

    return { success: true }
  } catch (err) {
    const error = err as Error
    console.error("Detailed error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    return { success: false, error: "Failed to send notification" }
  }
}
