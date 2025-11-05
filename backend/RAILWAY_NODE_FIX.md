# Railway Deployment Guide - Node Version Fix

## Problem
Railway was using Node 18, but Supabase requires Node 20+.

## Solution Applied

### 1. Added `.nvmrc` file
Created `backend/.nvmrc` with `20` - Railway should auto-detect this.

### 2. Added `engines` field to `package.json`
```json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=10.0.0"
}
```

### 3. Fixed Brevo SDK Issue
Replaced `@getbrevo/brevo` SDK with direct REST API calls using native `fetch` (compatible with Next.js 15).

## Railway Configuration

### Option 1: Railway should auto-detect `.nvmrc` (Recommended)
Just deploy - Railway should pick up Node 20 automatically.

### Option 2: Manual Node Version Setting
If Railway still uses Node 18:

1. Go to Railway Dashboard → Your Service → Settings
2. Find **"Environment Variables"** section
3. Add:
   ```
   NODE_VERSION=20
   ```

### Option 3: Update Railway Service Settings
In Railway Dashboard → Service → Settings → Build:
- Set **"Node Version"** to `20` or `20.x`

## What Changed

1. ✅ Removed `@getbrevo/brevo` dependency (SDK had module resolution issues)
2. ✅ Replaced with direct Brevo REST API calls (`fetch`)
3. ✅ Added Node 20 requirement via `.nvmrc` and `package.json` engines
4. ✅ Build now works locally and should work on Railway

## Testing

Build tested locally:
```bash
cd backend && npm run db:generate && npm run build
# ✅ Build successful
```

## Next Steps

1. Commit these changes
2. Push to trigger Railway deployment
3. If Railway still uses Node 18, manually set `NODE_VERSION=20` in Railway dashboard
4. Monitor build logs for any issues

## Build Command

Railway will run:
```bash
cd backend && npm install && npm run build
```

This should now:
- ✅ Use Node 20 (via `.nvmrc` or `engines` field)
- ✅ Install dependencies without Brevo SDK
- ✅ Build successfully with native fetch for Brevo API
