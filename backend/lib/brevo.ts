interface SendInviteEmailParams {
  email: string
  inviteCode: string
  appUrl?: string
}

export async function sendInviteEmail({
  email,
  inviteCode,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.reo.ai",
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.BREVO_FROM_EMAIL || "invites@reo.ai"

  if (!apiKey) {
    return {
      success: false,
      error: "BREVO_API_KEY not configured",
    }
  }

  try {
    const inviteLink = `${appUrl}/signup?invite=${inviteCode}`

    // Brevo Transactional Email API v3 (using native fetch)
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "Reo",
          email: fromEmail,
        },
        to: [{ email }],
        subject: "You're invited to Reo! 🎉",
        htmlContent: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; margin-bottom: 20px;">Welcome to Reo!</h1>
            
            <p style="color: #666; line-height: 1.6;">
              You're on the waitlist, and we're excited to have you try Reo! 
              Click the button below to create your account and get started.
            </p>
            
            <div style="margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background-color: #3b82f6; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        font-weight: 500;">
                Get Started with Reo
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link into your browser:<br>
              <a href="${inviteLink}" style="color: #3b82f6;">${inviteLink}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 40px;">
              This invite link is unique to you and will expire after use.
            </p>
          </div>
        `,
        textContent: `Welcome to Reo! Click here to get started: ${inviteLink}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `Brevo API error: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Brevo API error:", error)
    return {
      success: false,
      error: error?.message || "Unknown error",
    }
  }
}