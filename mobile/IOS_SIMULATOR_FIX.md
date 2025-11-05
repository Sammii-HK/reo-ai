# iOS Simulator Not Available - Use Web Instead

## Problem
- `simctl` error means iOS Simulator isn't available
- This happens if Xcode isn't installed or iOS tools aren't set up

## Solution: Use Web Browser (Easiest!)

Since iOS simulator isn't available, use web browser instead:

### Option 1: Press 'w' in Expo Terminal
When Expo is running, press `w` to open in web browser.

### Option 2: Use Expo Go on Phone
1. Make sure phone and computer are on same WiFi
2. Look for URL in terminal like `exp://192.168.x.x:8081`
3. Open Expo Go app → Enter URL manually
4. Paste the URL

### Option 3: Install Xcode (If You Want iOS Simulator)
```bash
# Install Xcode from App Store (large download ~12GB)
# Then run:
xcode-select --install
```

## Quick Fix: Use Web Browser

**Just press `w` in the Expo terminal** - easiest way to test!

The web version will work fine for testing the app flow, even if it's not fully native.
