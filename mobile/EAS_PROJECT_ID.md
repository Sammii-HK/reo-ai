# EAS Project ID Guide

## What is projectId?

The `projectId` in `app.json` is used by **EAS (Expo Application Services)** for:
- EAS Build (building production apps)
- EAS Submit (submitting to app stores)
- EAS Updates (OTA updates)

## Do You Need It?

**If you're NOT using EAS yet:**
- ✅ You can remove the `extra.eas.projectId` field entirely
- ✅ It's optional - your app will work without it

**If you want to use EAS Build later:**
- Run `eas init` or `eas build:configure`
- This will automatically generate and add a projectId

## Options

### Option 1: Remove It (Recommended for Now)
Remove the `extra.eas.projectId` field from `app.json` - it's optional.

### Option 2: Generate One
```bash
cd mobile
npx eas init
```
This will create an EAS project and add the projectId automatically.

### Option 3: Leave It (It Won't Break Anything)
If you leave `"projectId": "your-project-id"`, it just won't be used until you set up EAS.

## Recommendation

**For now:** Remove it or leave it as-is. You can add it later when you're ready to build production apps with EAS.

When you're ready to build:
1. Run `eas init`
2. It will automatically update `app.json` with the real projectId
