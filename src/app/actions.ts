"use server"

import webpush, { PushSubscription } from "web-push"

webpush.setVapidDetails(
  "https://mercari-next.vercel.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

let subscription: PushSubscription | null = null

export async function subscribeUser(subscription: PushSubscription) {
  try {
    // 保存订阅信息到数据库或其他存储
    return { success: true }
  } catch (error) {
    console.error("Subscribe error:", error)
    return { success: false, error: "Failed to subscribe user" }
  }
}

export async function unsubscribeUser() {
  try {
    // 从数据库中删除订阅信息
    return { success: true }
  } catch (error) {
    console.error("Unsubscribe error:", error)
    return { success: false, error: "Failed to unsubscribe user" }
  }
}

export async function sendNotification(message: string) {
  try {
    // 获取所有订阅
    const subscriptions: PushSubscription[] = [] // 这里应该从数据库获取订阅信息

    const payload = JSON.stringify({
      title: "Push Notification",
      body: message,
    })

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(subscription, payload)
      )
    )

    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => (result as PromiseRejectedResult).reason)

    if (errors.length > 0) {
      console.error("Some notifications failed:", errors)
    }

    return { success: true }
  } catch (error) {
    console.error("Send notification error:", error)
    return { success: false, error: "Failed to send notification" }
  }
}
