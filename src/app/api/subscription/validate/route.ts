import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import webpush from "web-push"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { endpoint } = await request.json()

    const subscription = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    })

    if (!subscription) {
      return NextResponse.json({ valid: false })
    }

    // 尝试发送一个空的推送消息来验证订阅
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({ type: "validation" }),
        { TTL: 0 } // 立即过期的消息，仅用于验证
      )

      return NextResponse.json({ valid: true })
    } catch (error: any) {
      if (error.statusCode === 410) {
        // Gone - subscription expired
        // 删除过期的订阅
        await prisma.pushSubscription.delete({
          where: { endpoint },
        })
      }
      return NextResponse.json({ valid: false })
    }
  } catch (error) {
    console.error("Validation error:", error)
    return NextResponse.json({ valid: false })
  }
}
