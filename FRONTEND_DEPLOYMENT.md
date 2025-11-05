# Frontend Deployment Checklist

## Pre-Deployment

✅ Frontend builds successfully
✅ All dependencies installed
✅ Environment variables documented

## Step 1: Push to GitHub

```bash
git push origin main
```

## Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your GitHub repository
4. **Project Settings**:
   - **Name**: `reo-landing` (or your choice)
   - **Root Directory**: `/` (root - leave default)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. **Environment Variables**:
   - `MAILERLITE_API_KEY` = your MailerLite API key
   - `MAILERLITE_AUDIENCE_ID` = your MailerLite audience ID (optional)
6. Click **Deploy**

## Step 3: Verify Deployment

1. Visit your Vercel URL: `https://reo-landing.vercel.app`
2. Test waitlist form:
   - Enter an email
   - Click "Join the waitlist"
   - Should see success message
3. Check MailerLite dashboard:
   - New subscriber should appear

## Troubleshooting

**Build fails:**
- Check build logs in Vercel
- Verify environment variables are set
- Check that `backend/` folder is excluded (should be automatic)

**Form doesn't work:**
- Check `MAILERLITE_API_KEY` is set correctly
- Verify API route is accessible: `/api/waitlist`
- Check browser console for errors

**Environment variables:**
- Must be added in Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding new variables
