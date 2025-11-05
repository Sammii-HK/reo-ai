# Reo - Complete Setup Guide

## ✅ Verified Working

- ✅ Frontend builds successfully
- ✅ Backend builds successfully  
- ✅ All TypeScript types valid
- ✅ No linting errors

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd reo-ai

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Set Up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Get credentials from **Settings** → **API** and **Database**

### 3. Create Environment Files

**Root `.env.local`** (for landing page):
```env
MAILERLITE_API_KEY=your_key
MAILERLITE_AUDIENCE_ID=your_audience_id
```

**Backend `backend/.env.local`**:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=$(openssl rand -base64 32)
```

### 4. Run Database Migrations

```bash
cd backend
npm run db:generate
npm run db:migrate
```

### 5. Test Locally

**Frontend:**
```bash
npm run dev
# http://localhost:3000
```

**Backend:**
```bash
cd backend
npm run dev
# http://localhost:3001
```

### 6. Test Builds

```bash
# Test frontend build
npm run build

# Test backend build
cd backend
npm run build:local
```

---

## Deployment

### Landing Page → Vercel

1. Push to GitHub
2. Vercel Dashboard → New Project
3. Import repo, root directory = `/`
4. Add env vars: `MAILERLITE_API_KEY`, `MAILERLITE_AUDIENCE_ID`
5. Deploy

### Backend API → Railway

1. Railway Dashboard → New Project → Deploy from GitHub
2. Root directory = `backend`
3. Build command = `npm run build`
4. Start command = `npm start`
5. Add all env vars from `backend/.env.local`
6. Deploy
7. Run migrations: `railway run npm run db:migrate`

---

## Project Structure

```
reo-ai/
├── app/                    # Frontend (Next.js landing page)
├── components/             # Frontend components
├── lib/                    # Frontend utilities
├── backend/
│   ├── app/api/           # Backend API routes
│   ├── lib/               # Backend utilities
│   ├── prisma/            # Database schema
│   └── ...
└── ...
```

---

## Testing Checklist

- [ ] Frontend builds: `npm run build`
- [ ] Backend builds: `cd backend && npm run build:local`
- [ ] Frontend runs: `npm run dev`
- [ ] Backend runs: `cd backend && npm run dev`
- [ ] Database migrations run: `cd backend && npm run db:migrate`
- [ ] Auth endpoints work: Test `/api/auth/signup`, `/api/auth/signin`

---

## Next Steps

1. Set up Supabase project
2. Run migrations
3. Test locally
4. Deploy to Vercel (frontend) and Railway (backend)
5. Build React Native app (Sprint 5+)

See `LOCAL_TESTING.md` and `DEPLOYMENT.md` for detailed guides.
