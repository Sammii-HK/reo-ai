# Cloudflare Workers Subrequest Limit - Solutions

## The Problem

Cloudflare Workers have a **50 subrequest limit** per request. This includes:
- `fetch()` calls to external APIs
- Database queries (if using D1/KV)
- Any HTTP requests

If you exceed 50 subrequests, you get: `"Too many subrequests"`

---

## Solutions

### Option 1: Batch Requests (Best for APIs)

Instead of making 100 individual requests, batch them:

```typescript
// ❌ BAD: 100 subrequests
for (const item of items) {
  await fetch(`https://api.example.com/item/${item.id}`)
}

// ✅ GOOD: 1 subrequest
const response = await fetch('https://api.example.com/batch', {
  method: 'POST',
  body: JSON.stringify({ items })
})
```

**Apply to your code:**
- Batch invite emails instead of sending one-by-one
- Use bulk API endpoints when available

---

### Option 2: Use Durable Objects (Cloudflare)

**Durable Objects** don't have subrequest limits:

```typescript
// Durable Object can make unlimited subrequests
export class InviteSender {
  async sendInvites(emails: string[]) {
    // Can make 1000+ requests here
    for (const email of emails) {
      await sendEmail(email)
    }
  }
}
```

**Trade-off:** More complex setup, but removes limits

---

### Option 3: Split Work Across Multiple Workers

Break large jobs into smaller chunks:

```typescript
// Worker 1: Coordinator
export default {
  async fetch(request) {
    const emails = await getEmails()
    
    // Split into chunks of 40 (under 50 limit)
    const chunks = chunkArray(emails, 40)
    
    // Trigger separate workers for each chunk
    for (const chunk of chunks) {
      await fetch('https://worker2.workers.dev/process', {
        method: 'POST',
        body: JSON.stringify(chunk)
      })
    }
  }
}

// Worker 2: Processor
export default {
  async fetch(request) {
    const emails = await request.json()
    // Process 40 emails (under 50 limit)
    for (const email of emails) {
      await sendEmail(email)
    }
  }
}
```

---

### Option 4: Use Queue (Cloudflare Queues)

**Cloudflare Queues** can handle unlimited work:

```typescript
// Producer: Add jobs to queue
export default {
  async fetch(request) {
    const emails = await getEmails()
    
    for (const email of emails) {
      await env.EMAIL_QUEUE.send({
        email,
        inviteCode: generateCode()
      })
    }
  }
}

// Consumer: Process queue (no subrequest limit)
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      await sendEmail(message.body.email)
    }
  }
}
```

**This is the best solution for background jobs!**

---

### Option 5: Move Heavy Work to Railway/Backend

For our daily summaries cron job:

**Instead of:**
- Cloudflare Worker → 100+ API calls → ❌ Hits limit

**Do:**
- Cloudflare Worker → Triggers Railway endpoint → Railway processes → ✅ No limits

```typescript
// Cloudflare Worker (just triggers)
export default {
  async scheduled(event, env) {
    // Single request to Railway
    await fetch('https://your-backend.railway.app/api/summaries/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RAILWAY_SECRET}` }
    })
  }
}
```

```typescript
// Railway endpoint (unlimited requests)
export async function POST(request: NextRequest) {
  const users = await prisma.user.findMany()
  
  // Can make 1000+ requests here
  for (const user of users) {
    await generateSummary(user.id)
    await sendEmail(user.email, summary)
  }
}
```

---

## For Your Project (Daily Summaries)

### Recommended: Cloudflare Worker → Railway

**Why:**
- ✅ Cloudflare Worker: Free cron (1 request)
- ✅ Railway: Unlimited processing (no subrequest limits)
- ✅ Best of both worlds

**Architecture:**
```
Cloudflare Worker (cron) 
  → Triggers Railway endpoint
    → Railway processes all summaries
      → Makes unlimited API calls
      → Sends emails
      → Updates database
```

---

## Current Code That Might Hit Limits

### ❌ Potential Issue: Batch Invite Sending

```typescript:backend/app/api/waitlist/invite/route.ts
// If sending 50+ invites, each email = 1 subrequest
for (const user of pending) {
  await sendInviteEmail(...) // 1 subrequest per email
}
```

**Fix:** Move to Railway (already done!) ✅

Railway doesn't have subrequest limits, so this code is fine.

---

## Quick Reference

| Solution | Use Case | Complexity |
|----------|----------|------------|
| **Batch Requests** | API calls | Low |
| **Durable Objects** | Complex stateful operations | Medium |
| **Queue** | Background jobs | Medium |
| **Railway Backend** | Heavy processing | Low ✅ |

---

## Summary

**For your project:**
- ✅ Backend on Railway = No subrequest limits
- ✅ Cloudflare Worker = Just triggers Railway (1 request)
- ✅ Heavy work = Railway (unlimited)

**No changes needed!** Your current architecture avoids this problem.
