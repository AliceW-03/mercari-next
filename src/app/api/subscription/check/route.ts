import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint")

  if (!endpoint) {
    return NextResponse.json({ exists: false })
  }

  try {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    })

    return NextResponse.json({ exists: !!subscription })
  } catch (error) {
    console.error("Error checking subscription:", error)
    return NextResponse.json({ exists: false })
  }
}
