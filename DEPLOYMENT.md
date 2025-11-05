# Deployment Guide

## Recommended Architecture

**Landing Page** → Vercel (perfect for frontend)  
**Backend API** → Railway (better for backend/APIs)  
**Database** → Supabase (via Railway or separate)

---

## Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Landing Page to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your GitHub repository
4. **Project Settings**:
   - **Name**: `reo-landing` (or your choice)
   - **Root Directory**: Leave as `/` (root)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. **Environment Variables**:
   - `MAILERLITE_API_KEY` = your MailerLite API key
   - `MAILERLITE_AUDIENCE_ID` = your MailerLite audience ID
6. Click **Deploy**

Your landing page will be live at: `https://reo-landing.vercel.app`

### Step 3: Deploy Backend API to Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Sign up/login (free tier: $5 credit/month)
3. Click **New Project** → **Deploy from GitHub**
4. Select your repository
5. **Service Settings**:
   - **Root Directory**: Set to `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Healthcheck Path**: `/api/health` (optional)
6. **Add Environment Variables**:
   - `DATABASE_URL` = from Supabase (Settings → Database → Connection string → URI)
   - `NEXT_PUBLIC_SUPABASE_URL` = from Supabase (Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = from Supabase (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` = from Supabase (Settings → API)
   - `JWT_SECRET` = generate with: `openssl rand -base64 32`
   - `NODE_ENV` = `production`
7. **Run Migrations**:
   - After first deploy, go to **Deployments** → **View Logs**
   - Or use Railway CLI: `railway run npm run db:migrate`
8. Click **Deploy**

Your backend API will be live at: `https://reo-api.railway.app` (or custom domain)

---

## Alternative: Keep Backend on Vercel

If you prefer to keep everything on Vercel (works but not optimal):

1. In Vercel Dashboard, click **Add New Project** again
2. Import the **same** GitHub repository
3. **Project Settings**:
   - **Name**: `reo-api`
   - **Root Directory**: `backend`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build:deploy`
4. **Add Supabase Integration** (Settings → Integrations)
5. Add other environment variables
6. Deploy

**Note**: Vercel works but Railway is better optimized for backends.

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
