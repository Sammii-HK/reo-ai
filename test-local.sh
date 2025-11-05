#!/bin/bash

# Local Testing Script for Reo
# Usage: ./test-local.sh

set -e  # Exit on error

echo "🧪 Testing Reo Locally"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
echo "📋 Checking environment files..."
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  Warning: .env.local not found in root${NC}"
  echo "   Create it with MAILERLITE_API_KEY and MAILERLITE_AUDIENCE_ID"
fi

if [ ! -f "backend/.env.local" ]; then
  echo -e "${RED}❌ Error: backend/.env.local not found${NC}"
  echo "   Create it with DATABASE_URL, SUPABASE keys, etc."
  echo "   See LOCAL_TESTING.md for details"
  exit 1
fi

# Test Frontend
echo ""
echo "1️⃣ Testing Frontend Build..."
cd "$(dirname "$0")"
if npm run build; then
  echo -e "${GREEN}✅ Frontend build successful${NC}"
else
  echo -e "${RED}❌ Frontend build failed${NC}"
  exit 1
fi

# Test Backend
echo ""
echo "2️⃣ Testing Backend Build..."
cd backend
if npm run build:local; then
  echo -e "${GREEN}✅ Backend build successful${NC}"
else
  echo -e "${RED}❌ Backend build failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "To run locally:"
echo "  Frontend: npm run dev (from root)"
echo "  Backend:  cd backend && npm run dev"
