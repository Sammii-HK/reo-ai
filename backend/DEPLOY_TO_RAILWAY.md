# Backend Deployment to Railway - Complete Guide

## Quick Summary

**Where**: Railway (railway.app)  
**Why**: Better for backends than Vercel (no cold starts, better for APIs)  
**Cost**: Free tier ($5 credit/month)

---

## Step-by-Step Deployment

### Step 1: Set Up Supabase (If Not Done)

1. Go to [supabase.com](https://supabase.com) (create account directly)
2. Create new project
3. Get credentials:
   - **Settings** → **API**: URL, anon key, service role key
   - **Settings** → **Database** → **Connection string** → **URI**

---

### Step 2: Push Code to GitHub

```bash
git add .
git commit -m "Ready for backend deployment"
git push origin main
```

---

### Step 3: Deploy to Railway

1. **Sign Up**: [railway.app](https://railway.app)
   - Free tier: $5 credit/month

2. **Create Project**:
   - Click **New Project**
   - **Deploy from GitHub**
   - Authorize Railway → Select your repo

3. **Configure Service**:
   Railway auto-detects Next.js, but verify:
   - **Root Directory**: `backend` ⚠️ **Important!**
   - **Build Command**: `npm run build` (default)
   - **Start Command**: `npm start` (default - uses PORT env var)

4. **Add Environment Variables**:
   Go to **Variables** tab, add these:

   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   BREVO_API_KEY=your_brevo_api_key
   BREVO_FROM_EMAIL=invites@reo.ai
   JWT_SECRET=generate_with_openssl_rand_base64_32
   NODE_ENV=production
   ```

   **Generate JWT_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

5. **Deploy**:
   - Railway auto-deploys when you add env vars
   - Watch build logs
   - Wait for "Deployed successfully"

---

### Step 4: Run Database Migrations

After deployment, you need to create database tables:

**Option A: Railway CLI (Easiest)**
```bash
npm i -g @railway/cli
railway login
railway link  # Select your project
railway run npm run db:migrate
```

**Option B: Supabase Dashboard**
1. Go to Supabase → SQL Editor
2. Run migrations manually from `backend/prisma/migrations/`

---

### Step 5: Test Deployment

1. **Check Service**: Should show "Running" ✅
2. **Visit URL**: `https://your-service.railway.app`
   - Should show API info page
3. **Test Endpoint**:
   ```bash
   curl https://your-service.railway.app/api/auth/signup \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

---

## Environment Variables Checklist

Copy these from Supabase:

✅ `DATABASE_URL` - PostgreSQL connection string  
✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL  
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key  
✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key  
✅ `BREVO_API_KEY` - From your Brevo account  
✅ `BREVO_FROM_EMAIL` - Your sender email  
✅ `JWT_SECRET` - Generate with `openssl rand -base64 32`  
✅ `NODE_ENV` - Set to `production`  

---

## Troubleshooting

**Build Fails:**
- Check **Root Directory** is `backend` (not `/`)
- Verify all env vars are set
- Check build logs for specific errors

**Database Connection:**
- Verify `DATABASE_URL` is correct (copy from Supabase)
- Check Supabase project is active
- Ensure database is accessible

**Migrations:**
- Use Railway CLI: `railway run npm run db:migrate`
- Or run manually in Supabase SQL Editor

**Port Issues:**
- Railway sets `PORT` automatically
- Don't hardcode port
- Our code uses `process.env.PORT || 3001` ✅

---

## After Deployment

- Backend URL: `https://your-service.railway.app`
- Update React Native app to use this URL
- Test all API endpoints
- Monitor logs in Railway dashboard

---

## Quick Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migrations
railway run npm run db:migrate

# View logs
railway logs
```