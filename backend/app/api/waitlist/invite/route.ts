import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendInviteEmail } from "@/lib/brevo"
import crypto from "crypto"

/**
 * POST /api/waitlist/invite
 * Send invites to waitlist subscribers (admin only)
 * TODO: Add admin auth check
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, count } = body

    if (email) {
      // Send invite to specific email
      const waitlist = await prisma.waitlist.findUnique({
        where: { email },
      })

      if (!waitlist) {
        return NextResponse.json(
          { error: "Email not found in waitlist" },
          { status: 404 }
        )
      }

      if (!waitlist.inviteCode) {
        const inviteCode = crypto.randomBytes(16).toString("hex")
        await prisma.waitlist.update({
          where: { id: waitlist.id },
          data: { inviteCode },
        })
        waitlist.inviteCode = inviteCode
      }

      // Send email with invite link
      const emailResult = await sendInviteEmail({
        email: waitlist.email,
        inviteCode: waitlist.inviteCode!,
      })

      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error || "Failed to send email" },
          { status: 500 }
        )
      }

      await prisma.waitlist.update({
        where: { id: waitlist.id },
        data: {
          status: "invited",
          invitedAt: new Date(),
        },
      })

      return NextResponse.json({
        message: "Invite sent",
        inviteCode: waitlist.inviteCode,
      })
    }

    // Send invites to next N pending users
    const pending = await prisma.waitlist.findMany({
      where: { status: "pending" },
      take: count || 10,
      orderBy: { createdAt: "asc" },
    })

    const results = []
    // Generate invite codes and send emails
    for (const user of pending) {
      if (!user.inviteCode) {
        const inviteCode = crypto.randomBytes(16).toString("hex")
        await prisma.waitlist.update({
          where: { id: user.id },
          data: { inviteCode },
        })
        user.inviteCode = inviteCode
      }

      // Send email
      const emailResult = await sendInviteEmail({
        email: user.email,
        inviteCode: user.inviteCode,
      })

      if (emailResult.success) {
        await prisma.waitlist.update({
          where: { id: user.id },
          data: {
            status: "invited",
            invitedAt: new Date(),
          },
        })
        results.push({ email: user.email, status: "sent" })
      } else {
        results.push({ email: user.email, status: "failed", error: emailResult.error })
      }
    }

    return NextResponse.json({
      message: `Processed ${pending.length} invites`,
      sent: results.filter(r => r.status === "sent").length,
      failed: results.filter(r => r.status === "failed").length,
      results,
    })
  } catch (error) {
    console.error("Invite API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}