# Mobile App Build & Test Guide

## ✅ Dependencies Installed

All npm packages are installed and ready.

## 🚀 Quick Start

### 1. Start Development Server
```bash
cd mobile
npm start
```

Then press:
- `i` - iOS simulator
- `a` - Android emulator  
- `w` - Web browser

### 2. Test on Device (Expo Go)

1. Install **Expo Go** app on your phone
2. Scan QR code from terminal
3. App will load on your device

## 📋 Pre-Flight Checklist

- [x] Dependencies installed
- [ ] Environment variables set (`.env` file)
- [ ] Backend deployed to Railway
- [ ] Supabase project set up

## 🧪 Test Checklist

### Backend (Railway)
- [ ] Test API endpoint: `curl https://reo-ai-production.up.railway.app/api/auth/signup`
- [ ] Check Railway logs for errors

### Mobile App
- [ ] Start Expo: `npm start`
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Test API connection

## 🔧 Environment Variables

Create `mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_API_URL=https://reo-ai-production.up.railway.app
```

## 📝 Next Steps

1. Set environment variables
2. Start Expo server
3. Test auth flow
4. Verify backend connection
5. Commit everything to git

Ready to test! 🚀
