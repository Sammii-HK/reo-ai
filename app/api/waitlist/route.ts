import { NextRequest, NextResponse } from "next/server"
import { addSubscriberToMailerLite } from "@/lib/email"

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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Add to MailerLite
    const result = await addSubscriberToMailerLite(email)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add email to waitlist" },
        { status: 500 }
      )
    }

    // TODO: Also save to database (Waitlist table) when backend is ready
    // This will be done via backend API call or sync script

    return NextResponse.json(
      { message: "Successfully added to waitlist" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Waitlist API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
