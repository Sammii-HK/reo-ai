import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

/**
 * POST /api/waitlist
 * Add email to waitlist (also saves to database)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Email already on waitlist", inviteCode: existing.inviteCode },
        { status: 200 }
      )
    }

    // Generate invite code
    const inviteCode = crypto.randomBytes(16).toString("hex")

    // Save to database
    const waitlist = await prisma.waitlist.create({
      data: {
        email,
        inviteCode,
        status: "pending",
        source: "landing_page",
      },
    })

    return NextResponse.json(
      { 
        message: "Successfully added to waitlist",
        inviteCode: waitlist.inviteCode,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Waitlist API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
