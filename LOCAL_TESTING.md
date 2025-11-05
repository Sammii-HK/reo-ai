# Local Testing Guide

## Prerequisites

1. **Node.js** installed (v18+)
2. **Supabase account** (free tier is fine)
3. **Environment variables** set up

---

## Step 1: Set Up Supabase Locally

### Option A: Use Supabase Cloud (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Wait for database to provision (~2 minutes)
3. Get your connection string: **Settings** → **Database** → **Connection string** → **URI**
4. Copy the `postgresql://` string

### Option B: Use Local PostgreSQL

```bash
# Install PostgreSQL locally or use Docker
docker run --name postgres-reo -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

---

## Step 2: Set Up Environment Variables

### Frontend (Root Directory)

Create `.env.local` in the root:

```env
MAILERLITE_API_KEY=your_key_here
MAILERLITE_AUDIENCE_ID=your_audience_id
```

### Backend

Create `backend/.env.local`:

```env
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Auth (from Supabase Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Auth
JWT_SECRET=generate_with_openssl_rand_base64_32

# Optional (for later)
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
STRIPE_SECRET_KEY=your_stripe_key
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

---

## Step 3: Run Database Migrations

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
```

This creates all tables in your database.

---

## Step 4: Test Frontend Locally

```bash
# From root directory
npm install
npm run dev
```

Visit: http://localhost:3000

**Test:**
- Landing page loads
- Email form works
- No build errors

---

## Step 5: Test Backend Locally

```bash
# From backend directory
cd backend
npm install
npm run dev
```

Backend runs on: http://localhost:3001

**Test API endpoints:**
```bash
# Test auth signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test auth signin
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Step 6: Test Together

1. Frontend runs on port 3000
2. Backend runs on port 3001
3. Update frontend API calls to use `http://localhost:3001` (when you add them)

---

## Troubleshooting

### "DATABASE_URL not found"
- Make sure `backend/.env.local` exists
- Check the file is in `backend/` directory, not root
- Restart the dev server after adding env vars

### "Prisma Client not generated"
```bash
cd backend
npm run db:generate
```

### "Migration failed"
```bash
cd backend
npm run db:migrate
# Or if migrations exist:
npx prisma migrate reset  # WARNING: Deletes all data
```

### Port already in use
- Frontend: Change port in `package.json` scripts
- Backend: Already set to 3001

---

## Quick Test Script

Create `test-local.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Reo Locally"
echo ""

echo "1️⃣ Testing Frontend..."
cd .
npm run build

echo ""
echo "2️⃣ Testing Backend..."
cd backend
npm run build:local

echo ""
echo "✅ All tests passed!"
```

Make it executable:
```bash
chmod +x test-local.sh
./test-local.sh
```
