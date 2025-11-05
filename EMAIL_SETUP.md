# Email Setup - Final Configuration

## Email Services Used

### 1. MailerLite (Waitlist Collection) ✅
- **Purpose**: Collect emails from landing page
- **Free Tier**: 1,000 subscribers, 12,000 emails/month
- **Setup**: Already configured

### 2. Brevo (Transactional Emails) ✅
- **Purpose**: Send invite emails, notifications
- **Free Tier**: 300 emails/day (9,000/month)
- **Setup**: Use your existing Brevo account

---

## Why Both?

- **MailerLite**: Better for collecting/managing waitlist subscribers
- **Brevo**: Better for transactional emails (invites, notifications)
- **Both are free** and work well together

---

## Environment Variables

### Frontend (`.env.local`):
```
MAILERLITE_API_KEY=your_mailerlite_key
MAILERLITE_AUDIENCE_ID=your_audience_id (optional)
```

### Backend (`backend/.env.local`):
```
BREVO_API_KEY=your_existing_brevo_api_key
BREVO_FROM_EMAIL=invites@reo.ai
```

---

## Setup

1. **MailerLite**: Already set up ✅
2. **Brevo**: Use your existing account API key ✅

That's it! Both services work independently.