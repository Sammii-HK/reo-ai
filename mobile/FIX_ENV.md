# Fix .env File - Remove Quotes

## Your .env file has quotes around values

**Current (WRONG):**
```env
EXPO_PUBLIC_SUPABASE_URL="https://..."
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Should be (CORRECT):**
```env
EXPO_PUBLIC_SUPABASE_URL=https://uldtwvxcusxwhpsuavbw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZHR3dnhjdXN4d2hwc3VhdmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzYyNzgsImV4cCI6MjA3NzkxMjI3OH0.k20HXMczCA_6V9QDTASRhm4kKeA_1b6Rk75A3Ls4-dM
EXPO_PUBLIC_API_URL=https://reo-ai-production.up.railway.app
```

## Fix It

1. Open `mobile/.env` file
2. **Remove quotes** from the values
3. **Add `https://`** to API_URL
4. Save the file
5. **Restart Expo** (Ctrl+C, then `npm start`)

The code now strips quotes automatically, but it's better to fix the file!
