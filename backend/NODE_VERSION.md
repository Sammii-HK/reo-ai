# Railway Node Version Configuration

Railway needs Node.js 20+ for Supabase compatibility.

## Option 1: Add .nvmrc (Recommended)

Created `.nvmrc` file in backend directory - Railway should auto-detect this.

## Option 2: Set in Railway Dashboard

1. Go to Railway Dashboard → Your Service → Settings
2. Look for **"Environment"** or **"Build"** section
3. Find **"Node Version"** or **"NODE_VERSION"** setting
4. Set to: `20` or `20.x`

## Option 3: Add to Environment Variables

Add to Railway environment variables:
```
NODE_VERSION=20
```

## Option 4: Update package.json

Railway also reads `engines` field in package.json. Let me add that.
