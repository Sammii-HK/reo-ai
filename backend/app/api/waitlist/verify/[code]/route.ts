import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/waitlist/verify/[code]
 * Verify invite code (for signup page)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params

    const waitlist = await prisma.waitlist.findUnique({
      where: { inviteCode: code },
    })

    if (!waitlist) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      )
    }

    if (waitlist.status === "signed_up") {
      return NextResponse.json(
        { error: "Invite code already used" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: waitlist.email,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
