# iOS Simulator Setup (Optional)

## Current Status
- ✅ **Web browser**: Ready to use (just press 'w')
- ⚠️ **iOS Simulator**: Needs full Xcode app

## Why iOS Simulator Doesn't Work
You have **CommandLineTools** installed, but iOS Simulator needs the **full Xcode app**.

## To Fix iOS Simulator (Optional)
1. Install Xcode from App Store (~12GB)
2. Open Xcode once to accept license
3. Run: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
4. Then iOS simulator will work

## For Now: Use Web Browser

**Just press `w` in Expo terminal** - it's the easiest way to test!

The web version works great for testing the app flow, auth, and navigation.

---

## Test in Web Browser

Once Expo starts:
1. Press `w` in terminal
2. Browser opens automatically
3. Test sign up, sign in, navigation

This is the quickest way to test everything! 🚀
