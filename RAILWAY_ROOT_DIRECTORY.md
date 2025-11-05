# Railway Root Directory - Where to Find It

## In Railway Dashboard

Looking at your Railway settings page, the root directory is usually in one of these places:

### Option 1: Service Settings → General
1. Click your service (reo-ai)
2. Go to **Settings** tab
3. Look for **"General"** section (might be collapsed)
4. Find **"Root Directory"** or **"Working Directory"** field
5. Set to: `backend`

### Option 2: Deployment Settings
1. Settings → **Deployments** sub-tab
2. Look for **"Source"** or **"Root Directory"** option

### Option 3: Service Menu
1. Click **"..."** (three dots) next to your service name
2. Select **"Settings"** or **"Configure"**
3. Look for root directory option

---

## If You Can't Find It

**Railway might auto-detect from the repo structure.** 

I've created `railway.json` at the root that tells Railway to:
- Change to `backend` directory
- Run `npm install` and `npm run build`
- Start with `npm start`

This should work even if you can't find the UI setting!

---

## Quick Test

After setting it up, Railway should:
1. Build from `backend/` directory
2. Install dependencies from `backend/package.json`
3. Run your Next.js API

Check the build logs to confirm it's using the right directory.