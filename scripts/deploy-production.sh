#!/bin/bash
# Production deployment script for server wallets system
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Server Wallets Production Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if project ref is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Project reference ID required${NC}"
  echo "Usage: ./scripts/deploy-production.sh <project-ref>"
  echo "Get your project ref from: https://supabase.com/dashboard/project/_/settings/general"
  exit 1
fi

PROJECT_REF=$1

echo -e "${YELLOW}📋 Project Reference: ${PROJECT_REF}${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}❌ Supabase CLI not found${NC}"
  echo "Install with: npm install -g supabase"
  exit 1
fi

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not logged in. Please login:${NC}"
  supabase login
fi

# Link project
echo ""
echo "🔗 Linking to project..."
supabase link --project-ref $PROJECT_REF

# Check if migrations exist
if [ ! -d "supabase/migrations" ]; then
  echo -e "${RED}❌ No migrations directory found${NC}"
  exit 1
fi

# Push migrations
echo ""
echo "📦 Deploying database migrations..."
supabase db push

# Check if secrets are set
echo ""
echo "🔑 Checking secrets..."
SECRETS=$(supabase secrets list 2>/dev/null || echo "")

if echo "$SECRETS" | grep -q "VITE_CDP_API_KEY"; then
  echo -e "${GREEN}✅ VITE_CDP_API_KEY is set${NC}"
else
  echo -e "${YELLOW}⚠️  VITE_CDP_API_KEY not set. Set it with:${NC}"
  echo "   supabase secrets set VITE_CDP_API_KEY=your-key"
fi

if echo "$SECRETS" | grep -q "VITE_CDP_API_SECRET"; then
  echo -e "${GREEN}✅ VITE_CDP_API_SECRET is set${NC}"
else
  echo -e "${YELLOW}⚠️  VITE_CDP_API_SECRET not set. Set it with:${NC}"
  echo "   supabase secrets set VITE_CDP_API_SECRET=your-secret"
fi

if echo "$SECRETS" | grep -q "WALLET_ENCRYPTION_KEY"; then
  echo -e "${GREEN}✅ WALLET_ENCRYPTION_KEY is set${NC}"
else
  echo -e "${YELLOW}⚠️  WALLET_ENCRYPTION_KEY not set. Generate and set it:${NC}"
  echo "   npx tsx scripts/generate-encryption-key.ts"
  echo "   supabase secrets set WALLET_ENCRYPTION_KEY=generated-key"
fi

# Deploy functions
echo ""
echo "🚀 Deploying Edge Functions..."

echo "  📤 Deploying create-wallet..."
supabase functions deploy create-wallet

echo "  📤 Deploying get-wallet..."
supabase functions deploy get-wallet

echo "  📤 Deploying send-transaction..."
supabase functions deploy send-transaction

# Success message
echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "🌐 Your functions are available at:"
echo "   https://${PROJECT_REF}.supabase.co/functions/v1/create-wallet"
echo "   https://${PROJECT_REF}.supabase.co/functions/v1/get-wallet"
echo "   https://${PROJECT_REF}.supabase.co/functions/v1/send-transaction"
echo ""
echo "📊 View logs:"
echo "   supabase functions logs create-wallet"
echo ""
echo "🧪 Test deployment:"
echo "   curl -X POST https://${PROJECT_REF}.supabase.co/functions/v1/create-wallet \\"
echo "     -H \"Authorization: Bearer YOUR_ANON_KEY\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"userAddress\": \"0x...\"}'"
echo ""

