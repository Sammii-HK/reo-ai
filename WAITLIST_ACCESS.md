# Waitlist → App Access Flow

## Current State

Right now we're just collecting emails in MailerLite. Here's how to get waitlist subscribers into the app:

---

## Option 1: Invite Links (Recommended)

**Flow:**
1. User signs up on landing page → Email saved to MailerLite
2. When app launches → Admin sends invite emails via MailerLite
3. Email contains: "Sign up for Reo" link → `https://app.reo.ai/signup?invite=CODE`
4. User clicks link → Creates account → Gets access

**Implementation:**
- Store invite codes in database
- Generate unique invite codes per waitlist user
- Send invite emails via MailerLite/Resend
- Signup page checks invite code validity

---

## Option 2: Auto-Create Accounts

**Flow:**
1. User signs up on landing page → Email saved
2. When app launches → Backend creates accounts automatically
3. Send password reset emails → "Set your password to access Reo"
4. User clicks link → Sets password → Gets access

**Implementation:**
- Store emails in Supabase (sync from MailerLite or use Supabase directly)
- Batch create accounts when ready
- Send password reset emails via Supabase Auth

---

## Option 3: Manual Invite Process

**Flow:**
1. User signs up → Email saved to MailerLite
2. Admin exports emails from MailerLite
3. Admin manually sends invites via app
4. Users get access

**Simple but manual**

---

## Recommended: Hybrid Approach

### Phase 1: Collect Emails (Current)
- Landing page → MailerLite
- ✅ Already implemented

### Phase 2: Store in Database (Add This)
- Sync emails from MailerLite to Supabase
- Store in `Waitlist` table with status, invite_code, etc.

### Phase 3: Send Invites (When Ready)
- Admin dashboard or script
- Generate invite codes
- Send emails via MailerLite/Resend with invite links
- Users sign up with invite code

---

## Implementation Plan

1. **Add Waitlist table to database** (sync emails)
2. **Create invite system** (generate codes, validate)
3. **Admin endpoint** (send invites, check status)
4. **Update signup flow** (accept invite codes)

Want me to implement this?
