# Bundle Identifier & Package Name Guide

## What Are These?

- **iOS `bundleIdentifier`**: Unique identifier for your iOS app (like `com.yourcompany.appname`)
- **Android `package`**: Similar identifier for Android apps

## Do You Need to Own the Domain?

**Short answer: No, but it's recommended.**

### Development/Testing
- ✅ You can use any format like `ai.reo.app` or `com.reo.app`
- ✅ Works fine for development builds
- ✅ Works fine for Expo Go

### Production Apps (App Store/Play Store)
- ⚠️ Should use a domain you own or control
- ⚠️ Format: `com.yourcompany.appname` (reverse domain)
- ⚠️ You'll need to prove ownership for some features

## Recommended Formats

### Option 1: Use Your Domain (If You Have One)
If you own `reo.ai`:
```json
"bundleIdentifier": "ai.reo.app"
"package": "ai.reo.app"
```

### Option 2: Use Generic Format (Common Practice)
If you don't own a domain yet:
```json
"bundleIdentifier": "com.reo.app"
"package": "com.reo.app"
```
This is fine - many apps use `com.company.app` without owning the domain.

### Option 3: Use Your Name/Company
```json
"bundleIdentifier": "com.yourname.reo"
"package": "com.yourname.reo"
```

## Best Practice

**For now:** Use `com.reo.app` - it's common practice and works fine.

**Later:** If you want to publish to App Store/Play Store, you can:
1. Keep `com.reo.app` (works fine)
2. Or register `reo.app` domain and use `app.reo.app`
3. Or use your personal domain if you have one

## Important Notes

- ✅ You can change this later before publishing
- ✅ This doesn't affect development/testing
- ✅ Format: `com.domain.appname` is standard
- ⚠️ Once published, changing bundle ID is difficult (creates new app)

## Current Recommendation

Use `com.reo.app` - it's simple, clear, and follows standard conventions.
