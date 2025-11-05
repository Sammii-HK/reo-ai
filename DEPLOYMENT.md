# Deployment Guide

## Quick Answer: Yes, Two Separate Vercel Projects

Deploy **two separate projects** from the same GitHub repository:
1. **Landing Page** (root directory)
2. **Backend API** (backend directory)

---

## Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Landing Page

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your GitHub repository
4. **Project Settings**:
   - **Name**: `reo-landing` (or your choice)
   - **Root Directory**: Leave as `/` (root) - this automatically excludes `backend/` folder
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. **Environment Variables**:
   - `MAILERLITE_API_KEY` = your MailerLite API key
   - `MAILERLITE_AUDIENCE_ID` = your MailerLite audience ID
6. Click **Deploy**

**Note**: The `backend/` folder is automatically excluded because Next.js only builds files in the `app/` directory at root level.

Your landing page will be live at: `https://reo-landing.vercel.app`

### Step 3: Deploy Backend API

1. Still in Vercel Dashboard, click **Add New Project** again
2. Import the **same** GitHub repository
3. **Project Settings**:
   - **Name**: `reo-api` (or your choice)
   - **Root Directory**: `backend` ⚠️ **Important: Set this to `backend`**
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build:deploy` (runs migrations)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
4. **Add Supabase Integration**:
   - Go to **Settings** → **Integrations**
   - Click **Add Integration** → **Supabase**
   - Connect your Supabase project (or create new)
   - This automatically adds:
     - `DATABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Additional Environment Variables** (Settings → Environment Variables):
   - `JWT_SECRET` = generate with: `openssl rand -base64 32`
   - `OPENAI_API_KEY` = (add when ready)
   - `RESEND_API_KEY` = (add when ready)
   - `STRIPE_SECRET_KEY` = (add when ready)
6. Click **Deploy**

Your backend API will be live at: `https://reo-api.vercel.app`

---

## Environment Variables Summary

### Landing Page Project (`reo-landing`):
```
MAILERLITE_API_KEY=...
MAILERLITE_AUDIENCE_ID=...
```

### Backend API Project (`reo-api`):
```
DATABASE_URL=... (auto-added by Supabase integration)
NEXT_PUBLIC_SUPABASE_URL=... (auto-added)
NEXT_PUBLIC_SUPABASE_ANON_KEY=... (auto-added)
JWT_SECRET=... (manual)
OPENAI_API_KEY=... (when ready)
RESEND_API_KEY=... (when ready)
STRIPE_SECRET_KEY=... (when ready)
```

---

## Why Two Separate Projects?

✅ **Separate URLs** - Landing page vs API  
✅ **Independent Deployments** - Deploy one without affecting the other  
✅ **Separate Environment Variables** - Clean separation  
✅ **Easier Scaling** - Scale API independently  
✅ **Different Domains** - Can use custom domains per project  

---

## After Deployment

1. **Test Landing Page**: Visit your landing page URL
2. **Test Backend API**: Visit `https://reo-api.vercel.app` (should show API info page)
3. **Update React Native App**: Use backend API URL in mobile app config

---

## Troubleshooting

### Backend Build Fails
- Check that `Root Directory` is set to `backend`
- Verify `DATABASE_URL` is set (Supabase integration)
- Check build logs for Prisma errors

### Migrations Not Running
- Verify `build:deploy` script includes `prisma migrate deploy`
- Check DATABASE_URL is correct
- Run migrations manually via Vercel CLI if needed

### Environment Variables Not Working
- Ensure variables are added to correct project
- Check variable names match exactly
- Redeploy after adding new variables
