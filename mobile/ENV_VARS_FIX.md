# Environment Variables Not Loading - Quick Fix

## Problem
Expo might not be loading `.env` file correctly. The error "No API key found" means Supabase credentials aren't being read.

## Quick Fix Options

### Option 1: Restart Expo (Try This First)
1. Stop Expo: `Ctrl+C`
2. Clear cache: `rm -rf .expo node_modules/.cache`
3. Restart: `npm start`

### Option 2: Check .env File
Make sure `mobile/.env` has:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_API_URL=https://reo-ai-production.up.railway.app
```

### Option 3: Add to app.json (More Reliable)
Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "your_anon_key"
    }
  }
}
```

### Option 4: Check Browser Console
Open browser DevTools → Console
Look for the debug log showing if variables are loaded

## What to Check
1. `.env` file exists in `mobile/` directory
2. Variables start with `EXPO_PUBLIC_`
3. No typos in variable names
4. Restart Expo after changing `.env`

Let me know what you see in the console logs!
