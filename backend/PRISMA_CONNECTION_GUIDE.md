# Prisma Connection Pooling Guide

## Problem: Prepared Statement Conflicts

**Error:** `prepared statement "sX" already exists` (PostgreSQL error code: 42P05)

**Root Cause:** Connection pooling (e.g., Supabase PgBouncer) doesn't support prepared statements across connections. When multiple requests reuse the same connection pool, Prisma tries to create prepared statements that conflict.

## Solution: Retry Logic

**DO NOT:** Use invalid internal Prisma options like `__internal.useUds` - these don't exist and will cause build failures.

**DO:** Use retry logic with exponential backoff for all Prisma queries.

### Implementation

1. **Create retry helper** (`backend/lib/prisma-helper.ts`):
   - Detects prepared statement errors (code `42P05` or message contains "prepared statement")
   - Retries up to 3 times with exponential backoff (100ms, 200ms, 300ms)
   - Reusable for all Prisma queries

2. **Wrap all Prisma queries** in domain endpoints:
   ```typescript
   import { retryQuery } from '@/lib/prisma-helper'
   
   const domains = await retryQuery(() =>
     prisma.domain.findMany({ where: { userId } })
   )
   ```

3. **Keep Prisma client simple**:
   ```typescript
   export const prisma = new PrismaClient({
     log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
   })
   ```
   - No internal options
   - Singleton pattern via `globalThis` for serverless

## When to Use Retry Logic

**Always use retry logic for:**
- All database queries in API routes
- Queries that might run concurrently
- Any query in production environments with connection pooling

**Already wrapped:**
- ✅ `/api/domains` (GET, POST)
- ✅ `/api/domains/ensure` (POST)
- ✅ `/api/domains/[domainId]` (PATCH)

**Need to wrap:**
- ⚠️ Other endpoints that use Prisma (check if they have prepared statement errors)

## Testing

If you see prepared statement errors in production:
1. Check if the endpoint uses `retryQuery`
2. Add retry logic if missing
3. Verify build succeeds without invalid Prisma options

## Key Takeaways

1. **Never use undocumented/internal Prisma options** - they break builds
2. **Always wrap Prisma queries in retry logic** for connection pooling environments
3. **Use singleton pattern** for Prisma client in serverless environments
4. **Test builds locally** before deploying (`npm run build`)


