/**
 * MailerLite API integration for email collection
 * Free tier: 1,000 subscribers, 12,000 emails/month
 */

interface MailerLiteSubscriber {
  email: string
  status?: "active" | "unsubscribed" | "bounced" | "junk"
  groups?: string[]
}

export async function addSubscriberToMailerLite(
  email: string,
  audienceId?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.MAILERLITE_API_KEY
  const groupId = audienceId || process.env.MAILERLITE_AUDIENCE_ID

  if (!apiKey) {
    return {
      success: false,
      error: "MailerLite API key not configured",
    }
  }

  try {
    // MailerLite API v2 endpoint
    const url = groupId
      ? `https://api.mailerlite.com/api/v2/groups/${groupId}/subscribers`
      : "https://api.mailerlite.com/api/v2/subscribers"

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MailerLite-ApiKey": apiKey,
      },
      body: JSON.stringify({
        email,
        status: "active",
      } satisfies MailerLiteSubscriber),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // If subscriber already exists, that's okay
      if (response.status === 409 || response.status === 400) {
        return { success: true }
      }

      return {
        success: false,
        error: errorData.message || `MailerLite API error: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("MailerLite API error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}