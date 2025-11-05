# Supabase Setup (Direct Account)

## ⚠️ Important: Create Supabase Account Directly

**Don't use Vercel Marketplace** - Create your Supabase account directly:

1. Go to **[supabase.com](https://supabase.com)**
2. Click **Start your project**
3. Sign up with email/GitHub (separate from Vercel)
4. Create a new organization/project
5. Create your project

**Why?**
- Vercel Marketplace creates a managed organization
- You can't create projects directly in managed orgs
- Creating directly gives you full control
- You can still connect it to Vercel later via integration

## After Creating Project

1. Wait for database to provision (~2 minutes)
2. Get your credentials:
   - **Settings** → **API**: Get URL and keys
   - **Settings** → **Database** → **Connection string** → **URI**: Get DATABASE_URL

## Connecting to Vercel (Optional)

If you want to use Vercel's Supabase integration later:
1. Go to Vercel Dashboard → Project Settings → Integrations
2. Add Supabase integration
3. Select your existing Supabase project (the one you created directly)
4. Vercel will auto-inject env vars

**But for Railway deployment, you'll add env vars manually anyway!**
