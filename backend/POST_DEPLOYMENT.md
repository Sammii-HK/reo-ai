# Post-Deployment Checklist - After Adding Env Vars to Railway

## ✅ Step 1: Verify Environment Variables Are Set

Go to Railway Dashboard → Your Service → **Variables** tab, confirm these are set:

### Required Variables:
- [ ] `DATABASE_URL` - PostgreSQL connection string from Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `BREVO_API_KEY` - Your Brevo API key
- [ ] `BREVO_FROM_EMAIL` - Your sender email (e.g., `invites@reo.ai`)
- [ ] `NODE_ENV` - Set to `production`

### Optional (you can skip JWT_SECRET for now):
- [ ] `JWT_SECRET` - Only if you plan to use custom JWT signing (not needed with Supabase Auth)

---

## ✅ Step 2: Check Deployment Status

1. **Railway Dashboard** → Your Service
2. **Check Build Logs**:
   - Should show "Build successful" ✅
   - Should show "Deployed successfully" ✅
3. **Check Service Status**:
   - Should show "Running" ✅

---

## ✅ Step 3: Run Database Migrations

**Important**: Railway builds the app, but you need to create database tables!

### Option A: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project (select your backend service)
railway link

# Run migrations
railway run npm run db:migrate
```

### Option B: Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy contents from `backend/prisma/migrations/` (if any exist)
3. Or run: `prisma migrate deploy` manually

---

## ✅ Step 4: Get Your Backend URL

1. Railway Dashboard → Your Service → **Settings**
2. Find **"Generate Domain"** button
3. Copy the URL (e.g., `https://your-service.railway.app`)

**Save this URL** - you'll need it for:
- Frontend API calls
- Testing endpoints
- React Native app configuration

---

## ✅ Step 5: Test Your Backend

### Test Health Check:
```bash
curl https://your-service.railway.app
```

Should return a response (even if 404, means backend is running).

### Test Signup Endpoint:
```bash
curl -X POST https://your-service.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Should return user data with session tokens.

### Test Waitlist Endpoint:
```bash
curl -X POST https://your-service.railway.app/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## ✅ Step 6: Update Frontend (If Needed)

If your frontend needs the backend URL:

1. Update `.env.local` or `.env.production`:
   ```
   NEXT_PUBLIC_API_URL=https://your-service.railway.app
   ```

2. Or update API calls in your code to use Railway URL

---

## ✅ Step 7: Monitor Logs

**Railway Dashboard** → Your Service → **Logs** tab

Watch for:
- ✅ Successful API requests
- ⚠️ Errors or warnings
- 📊 Request patterns

---

## 🎯 What Happens Next?

After env vars are set and migrations run:

1. ✅ **Backend is live** - API endpoints are accessible
2. ✅ **Database is ready** - Tables created, ready for data
3. ✅ **Auth works** - Supabase Auth integrated
4. ✅ **Email works** - Brevo configured for invites

---

## 🚨 Common Issues

**"Database connection failed"**
- Check `DATABASE_URL` is correct
- Verify Supabase project is active
- Check connection pooling settings

**"Migration failed"**
- Make sure `DATABASE_URL` is set
- Try Railway CLI: `railway run npm run db:migrate`
- Check Supabase SQL Editor for errors

**"Build succeeded but service won't start"**
- Check logs for errors
- Verify `PORT` env var (Railway sets this automatically)
- Check all required env vars are set

---

## 📝 Quick Reference

**Railway URL Format**: `https://[service-name].railway.app`

**Test Command**:
```bash
curl https://your-service.railway.app/api/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**View Logs**: Railway Dashboard → Service → Logs tab

**Run Commands**: `railway run [command]` (after `railway link`)
