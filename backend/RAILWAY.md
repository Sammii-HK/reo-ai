# Railway Deployment Setup

## Why Railway for Backend?

✅ **Built for backends** - Optimized for APIs/services  
✅ **Free tier** - $5 credit/month (plenty for testing)  
✅ **No cold starts** - Always warm  
✅ **Easy PostgreSQL** - Can add database or use Supabase  
✅ **Simple deployment** - Connect GitHub, deploy  
✅ **Great DX** - Good logs, monitoring, env vars UI  

---

## Quick Setup

1. **Sign up**: [railway.app](https://railway.app) (free tier)
2. **Create Project**: New Project → Deploy from GitHub
3. **Select Repo**: Choose your repo
4. **Configure**:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. **Add Environment Variables** (see below)
6. **Deploy**: Railway auto-deploys on push

---

## Environment Variables

Add these in Railway Dashboard → Variables:

```
DATABASE_URL=postgresql://... (from Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://... (from Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY=... (from Supabase)
SUPABASE_SERVICE_ROLE_KEY=... (from Supabase)
JWT_SECRET=... (generate with openssl rand -base64 32)
NODE_ENV=production
PORT=3001
```

---

## Running Migrations

After first deployment:

**Option 1: Railway CLI**
```bash
npm i -g @railway/cli
railway login
railway link
railway run npm run db:migrate
```

**Option 2: One-time Service**
- Create temporary service in Railway
- Run: `npm run db:migrate`
- Delete service after

**Option 3: Manual via Supabase Dashboard**
- Go to Supabase → SQL Editor
- Run migration SQL manually

---

## Pricing

- **Free**: $5 credit/month
- **Pro**: $5/month + usage (~$10-20/month typical)

Much cheaper than Vercel Pro for backend workloads!

---

## Custom Domain

Railway provides free subdomain: `reo-api.railway.app`

Or add custom domain:
1. Railway Dashboard → Settings → Networking
2. Add custom domain
3. Update DNS records

---

## Monitoring

Railway provides:
- ✅ Deployment logs
- ✅ Real-time logs
- ✅ Metrics (CPU, memory, requests)
- ✅ Health checks

Perfect for debugging backend issues!
