# 🧪 Testing Guide - Quick Start

## ✅ Backend Test

Test if backend is responding:
```bash
curl https://reo-ai-production.up.railway.app/api/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Expected**: JSON response with user data and session tokens

---

## 📱 Mobile App Testing

### Expo is Starting...

Once Expo starts, you'll see:
- QR code in terminal
- Options: `i` (iOS), `a` (Android), `w` (web)

### Test Flow:

1. **Sign Up** (First Time)
   - Email: `test@example.com`
   - Password: `password123`
   - Should create account and redirect to sign in

2. **Sign In**
   - Use same credentials
   - Should redirect to Home tab

3. **Navigate**
   - Test all tabs: Home, Chat, Domains, Settings
   - Check navigation works

4. **Sign Out**
   - Go to Settings tab
   - Tap Sign Out
   - Should return to sign in screen

### Common Issues:

**"Network request failed"**
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Verify backend is running: `curl https://reo-ai-production.up.railway.app`

**"Missing Supabase variables"**
- Check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`

**Expo won't start**
- Make sure you're in `mobile/` directory
- Run `npm install` if needed

---

## 🎯 What to Test

- [ ] Backend API responds
- [ ] Mobile app loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Navigation works
- [ ] Sign out works
- [ ] API calls succeed

Let's test! 🚀
