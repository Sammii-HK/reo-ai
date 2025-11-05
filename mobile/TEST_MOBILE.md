# 🧪 Testing Mobile App - Quick Guide

## ✅ Expo is Starting...

Once Expo starts, you'll see:
- QR code in terminal
- Options: `i` (iOS), `a` (Android), `w` (web)

## 📱 Test Flow

### 1. **Start Expo**
```bash
cd mobile
npm start
```

### 2. **Open on Device/Simulator**

**Option A: iOS Simulator**
- Press `i` in terminal
- Or open simulator manually: `open -a Simulator`

**Option B: Android Emulator**
- Press `a` in terminal
- Or open emulator manually

**Option C: Expo Go (Phone)**
- Install Expo Go app from App Store/Play Store
- Scan QR code from terminal
- App loads on your phone

**Option D: Web Browser**
- Press `w` in terminal
- Opens in browser (limited functionality)

### 3. **Test Sign Up**
1. App opens → Should show Sign In screen
2. Tap "Sign up" link
3. Enter:
   - Email: `test@example.com`
   - Password: `password123`
4. Tap "Sign Up"
5. Should create account and redirect

### 4. **Test Sign In**
1. Use same credentials
2. Tap "Sign In"
3. Should redirect to Home tab

### 5. **Test Navigation**
- Tap tabs: Home, Chat, Domains, Settings
- Should navigate smoothly

### 6. **Test Sign Out**
- Go to Settings tab
- Tap "Sign Out"
- Should return to sign in screen

## 🐛 If Backend Not Working

If you see errors:
- "Network request failed" → Backend might be down
- "Invalid credentials" → Check Supabase env vars
- "Cannot connect" → Check API URL in `.env`

The app will show clear error messages!

## ✅ What to Look For

- ✅ App loads without crashing
- ✅ Sign up creates account
- ✅ Sign in works
- ✅ Navigation works
- ✅ No errors in console

Let's test! 🚀
