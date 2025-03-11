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
  const isApplePush = subscription.endpoint.includes("web.push.apple.com")

  const options: RequestOptions = {
    timeout: isApplePush ? 60000 : 30000, // iOS 需要更长的超时时间
    TTL: 60 * 60,
    // iOS 推送需要特殊处理
    headers: isApplePush
      ? {
          "apns-priority": "5",
          "apns-push-type": "alert",
        }
      : undefined,
    urgency: "high",
  }

  for (let i = 0; i < retries; i++) {
    try {
      console.log(
        `Attempting to send notification to ${
          isApplePush ? "iOS" : "other"
        } device...`
      )
      await webpush.sendNotification(subscription, payload, options)
      console.log("Notification sent successfully")
      return true
    } catch (err) {
      const error = err as WebPushError
      console.error("Push error:", {
        statusCode: error.statusCode,
        message: error.message,
        endpoint: subscription.endpoint,
      })

      // iOS 特定错误处理
      if (isApplePush && error.statusCode === 410) {
        console.log("iOS subscription expired")
        throw error
      }

      if (i === retries - 1) throw error

      // iOS 需要更长的重试间隔
      const delay = isApplePush
        ? Math.min(5000 * Math.pow(2, i), 30000)
        : Math.min(1000 * Math.pow(2, i), 10000)

      console.log(`Waiting ${delay}ms before retry...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
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
      // iOS 需要这些字段
      sound: "default",
      badge: 1,
      mutable_content: 1,
      "content-available": 1,
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
