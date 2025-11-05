# ⚠️ Backend Issue Detected

## Problem
Backend API returned: `{"error":"Internal server error"}`

## Possible Causes

1. **Database Migrations Not Run**
   - Tables might not exist yet
   - Need to run: `railway run npm run db:migrate`

2. **Environment Variables Missing**
   - Check Railway dashboard → Variables tab
   - Ensure all required vars are set

3. **Database Connection Issue**
   - Check `DATABASE_URL` is correct
   - Verify Supabase project is active

## Quick Fixes

### Option 1: Run Migrations
```bash
railway login
railway link
railway run npm run db:migrate
```

### Option 2: Check Railway Logs
```bash
railway logs
```

Or check Railway Dashboard → Service → Logs

### Option 3: Verify Environment Variables
Railway Dashboard → Service → Variables:
- ✅ `DATABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

## Test Again After Fix

```bash
curl https://reo-ai-production.up.railway.app/api/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Should return user data, not error.
