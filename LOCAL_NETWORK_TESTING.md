# Local Network Testing Guide

This guide shows you how to test the app on your local network without using localhost or deploying to the app store.

## Prerequisites

- Both your computer and mobile device must be on the **same WiFi network**
- Backend must be running on your computer
- Mobile device (iPhone/Android) for testing

## Step 1: Find Your Local IP Address

### On macOS:
```bash
# Get your local IP address
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for something like `192.168.1.xxx` or `10.0.0.xxx`

Or use:
```bash
ipconfig getifaddr en0
```

### On Windows:
```bash
ipconfig
```

Look for `IPv4 Address` under your active network adapter (usually `192.168.x.x`)

### On Linux:
```bash
hostname -I
```

## Step 2: Configure Backend to Accept Network Connections

The Next.js backend needs to be accessible on your local network.

### Option A: Use Your Local IP (Recommended)

1. Start the backend with your local IP:
```bash
cd backend
npm run dev -- -H 0.0.0.0
```

Or modify `package.json` to add a script:
```json
"dev:network": "next dev -H 0.0.0.0"
```

Then run:
```bash
npm run dev:network
```

The backend will be accessible at: `http://YOUR_LOCAL_IP:3000`

### Option B: Use Environment Variable

Create/update `backend/.env.local`:
```env
HOST=0.0.0.0
PORT=3000
```

Then run:
```bash
npm run dev
```

## Step 3: Configure Mobile App to Use Local Backend

1. Create `mobile/.env.local` (or update existing `.env`):
```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `YOUR_LOCAL_IP` with your actual IP (e.g., `http://192.168.1.100:3000`)

**Important**: Use `http://` not `https://` for local network

2. Restart Expo:
```bash
cd mobile
npm start
```

Or if you need to clear cache:
```bash
npm start -- --clear
```

## Step 4: Test on Physical Device

### For iOS:
1. Open Expo Go app on your iPhone
2. Make sure iPhone is on the same WiFi network
3. Scan the QR code from terminal OR
4. Type the URL manually: `exp://YOUR_LOCAL_IP:8081`

### For Android:
1. Open Expo Go app on your Android device
2. Make sure Android is on the same WiFi network
3. Scan the QR code from terminal OR
4. Type the URL manually: `exp://YOUR_LOCAL_IP:8081`

## Troubleshooting

### "Cannot connect to backend"
1. **Check firewall**: Make sure your firewall allows connections on port 3000
   - macOS: System Settings → Network → Firewall → Allow incoming connections
   - Windows: Windows Defender → Allow app through firewall

2. **Verify IP address**: Make sure you're using the correct IP address
   ```bash
   # Test if backend is accessible
   curl http://YOUR_LOCAL_IP:3000/api/domains
   ```

3. **Check network**: Ensure both devices are on the same WiFi network

### "Network request failed"
1. Make sure you're using `http://` not `https://` for local network
2. Check that backend is running: `curl http://localhost:3000/api/domains`
3. Try accessing backend from mobile browser: `http://YOUR_LOCAL_IP:3000`

### CORS Issues
If you get CORS errors, make sure your backend allows requests from your local network. Check `backend/lib/auth.ts` or CORS configuration.

### Expo Can't Connect
1. Make sure Expo is using the right network:
   ```bash
   # In mobile directory
   npm start -- --lan
   ```
   
2. Try using tunnel mode (if LAN doesn't work):
   ```bash
   npm start -- --tunnel
   ```

## Quick Start Script

Create a script to automate this:

### `test-local-network.sh`:
```bash
#!/bin/bash

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 || hostname -I | awk '{print $1}')

echo "📍 Your local IP: $LOCAL_IP"
echo ""
echo "1. Backend will be accessible at: http://$LOCAL_IP:3000"
echo "2. Update mobile/.env.local with: EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3000"
echo "3. Start backend: cd backend && npm run dev:network"
echo "4. Start mobile: cd mobile && npm start"
echo ""
read -p "Press enter to continue..."

# Start backend
cd backend
HOST=0.0.0.0 npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start mobile
cd ../mobile
npm start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
```

Make it executable:
```bash
chmod +x test-local-network.sh
./test-local-network.sh
```

## Alternative: Use ngrok (For Testing from Anywhere)

If you want to test from outside your local network:

1. Install ngrok: `brew install ngrok` (macOS) or download from ngrok.com
2. Start your backend normally: `cd backend && npm run dev`
3. In another terminal, create tunnel:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update `mobile/.env.local`:
   ```env
   EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
   ```
6. Restart Expo: `cd mobile && npm start -- --clear`

## Testing Checklist

- [ ] Backend is running on `0.0.0.0:3000`
- [ ] Mobile device is on same WiFi network
- [ ] `mobile/.env.local` has correct `EXPO_PUBLIC_API_URL`
- [ ] Expo has been restarted after env changes
- [ ] Can access backend from mobile browser
- [ ] Firewall allows port 3000
- [ ] Both devices can ping each other

## Notes

- **Local network only**: This setup only works on your local WiFi network
- **No HTTPS**: Local network uses HTTP (not secure, but fine for testing)
- **IP may change**: Your local IP might change if you reconnect to WiFi
- **Supabase**: Still uses production Supabase (auth, database)
- **Not for production**: This is for development/testing only

