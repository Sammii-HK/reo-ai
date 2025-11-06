# Backend Setup & Testing

## Quick Start

### 1. Create Environment File

Create `backend/.env.local`:

```env
# Database (from Supabase Settings → Database → Connection string → URI)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Auth (from Supabase Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Auth
JWT_SECRET=generate_with_openssl_rand_base64_32

# OpenAI (REQUIRED for NLU parsing)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini  # Optional: defaults to gpt-4o-mini

# LLM Provider (Optional: defaults to 'openai')
# LLM_PROVIDER=openai  # Options: openai, claude, ollama
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Run Migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4. Test Locally

```bash
npm run dev
```

Backend runs on: http://localhost:3001

### 5. Test Build

```bash
npm run build:local
```

---

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for backend)
- `OPENAI_API_KEY` - **Required** - For LLM-based natural language parsing (get from https://platform.openai.com/api-keys)
- `JWT_SECRET` - Random secret (generate with `openssl rand -base64 32`)

**Optional (for later):**
- `RESEND_API_KEY` - For email summaries
- `STRIPE_SECRET_KEY` - For billing

---

## Prisma Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (dev)
- `npm run db:migrate` - Create and run migrations (dev)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run build:local` - Build without migrations (for testing)
- `npm run build:deploy` - Build with migrations (for production)

---

## Testing API Endpoints

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Sign in
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Verify token (replace TOKEN with access_token from signin)
curl http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer TOKEN"
```

---

## Troubleshooting

**"DATABASE_URL not found"**
- Make sure `backend/.env.local` exists
- Check file is in `backend/` directory
- Restart dev server after adding env vars

**"Migration failed"**
- Check DATABASE_URL is correct
- Make sure database is accessible
- Try: `npm run db:push` for development

**See `LOCAL_TESTING.md` for full testing guide**
