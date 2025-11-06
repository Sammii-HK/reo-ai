# Quick Start: Local Network Testing

## Your Local IP: 192.168.68.113

## Steps:

### 1. Start Backend (Terminal 1)
```bash
./test-local.sh
```

Or manually:
```bash
cd backend
npm run dev:network
```

Backend will be at: **http://192.168.68.113:3001**

### 2. Configure Mobile App

Create `mobile/.env.local`:
```env
EXPO_PUBLIC_API_URL=http://192.168.68.113:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Mobile App (Terminal 2)
```bash
cd mobile
npm start -- --clear
```

### 4. Connect on Your Phone

- Open Expo Go app
- Make sure phone is on **same WiFi network**
- Scan QR code OR manually enter: `exp://192.168.68.113:8081`

## Troubleshooting

### Can't connect?
1. Check firewall allows port 3001
2. Test backend: Open `http://192.168.68.113:3001/api/domains` in phone browser
3. Verify same WiFi network

### IP changed?
Run: `ipconfig getifaddr en0` (macOS) to get new IP

See `LOCAL_NETWORK_TESTING.md` for detailed guide.
