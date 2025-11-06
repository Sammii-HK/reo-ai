#!/bin/bash

# Get local IP address
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not determine local IP address"
    echo "Please run: ipconfig getifaddr en0 (macOS) or ipconfig (Windows)"
    exit 1
fi

echo "📍 Your local IP address: $LOCAL_IP"
echo ""
echo "Backend will be accessible at: http://$LOCAL_IP:3001"
echo ""
echo "📱 Mobile App Configuration:"
echo "Update mobile/.env.local with:"
echo "  EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3001"
echo ""
echo "⚠️  Important:"
echo "1. Make sure your phone is on the same WiFi network"
echo "2. Backend runs on port 3001 (not 3000)"
echo "3. Use http:// not https:// for local network"
echo ""
read -p "Press enter to start backend on network..."

# Start backend with network access
cd backend
npm run dev:network
