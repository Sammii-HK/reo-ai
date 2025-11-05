# Railway Environment Variables Setup

## Required Environment Variables

The backend needs these Supabase environment variables set in Railway:

### Supabase Configuration
1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://uldtwvxcusxwhpsuavbw.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anon/public key
   - Found in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

### Optional (for admin operations)
3. **SUPABASE_SERVICE_ROLE_KEY**
   - Service role key (for admin operations)
   - Found in: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`

### Database
4. **DATABASE_URL**
   - Your Supabase PostgreSQL connection string
   - Found in: Supabase Dashboard → Settings → Database → Connection string → URI

## How to Add in Railway

1. Go to Railway Dashboard
2. Select your backend service
3. Click on "Variables" tab
4. Add each variable:
   - Click "New Variable"
   - Add the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Add the value
   - Click "Add"

## Important Notes

- `NEXT_PUBLIC_*` variables are exposed to the client, so they're safe to use in the frontend
- After adding variables, Railway will automatically redeploy
- The error "Missing Supabase environment variables" means these aren't set

## Current Error

The backend is failing because `NEXT_PUBLIC_SUPABASE_URL` and/or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set in Railway.

Fix: Add these two variables to Railway, then the backend will be able to verify auth tokens.

