#!/bin/bash
# Script to start Supabase Edge Functions locally
# This script starts Supabase and serves Edge Functions with environment variables

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Supabase Edge Functions...${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo -e "${YELLOW}Install it with: npm install -g supabase${NC}"
    echo -e "${YELLOW}Or visit: https://supabase.com/docs/guides/cli${NC}"
    exit 1
fi

# Check if .env file exists
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ] && [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env or .env.local file found${NC}"
    echo -e "${YELLOW}Creating .env.local template...${NC}"
    cat > .env.local << EOF
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# CDP API Configuration
VITE_CDP_API_KEY=your-cdp-api-key-id
VITE_CDP_API_SECRET=your-cdp-api-key-secret
CDP_WALLET_SECRET=your-cdp-wallet-secret

# CDP Network
CDP_NETWORK_ID=base-sepolia
EOF
    echo -e "${YELLOW}Please fill in your environment variables in .env.local${NC}"
    exit 1
fi

# Determine which env file to use
if [ -f "$ENV_FILE" ]; then
    ENV_FILE_TO_USE="$ENV_FILE"
else
    ENV_FILE_TO_USE=".env"
fi

echo -e "${BLUE}📋 Using environment file: ${ENV_FILE_TO_USE}${NC}"

# Check if Supabase is already running
if curl -s http://localhost:54321/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase is already running${NC}"
else
    echo -e "${YELLOW}⚠️  Supabase is not running. Starting Supabase...${NC}"
    echo -e "${BLUE}This may take a minute...${NC}"
    supabase start
    echo ""
fi

# Get the anon key from Supabase status
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}' | tr -d '"' || echo "")

if [ -z "$ANON_KEY" ]; then
    echo -e "${YELLOW}⚠️  Could not get anon key from Supabase status${NC}"
    echo -e "${YELLOW}Run 'supabase status' to see your keys${NC}"
else
    echo -e "${GREEN}✅ Supabase anon key: ${ANON_KEY:0:20}...${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Starting Edge Functions server...${NC}"
echo -e "${YELLOW}Edge Functions will be available at: http://localhost:54321/functions/v1/${NC}"
echo ""
echo -e "${BLUE}Available functions:${NC}"
echo -e "  - create-wallet"
echo -e "  - get-wallet"
echo -e "  - send-transaction"
echo ""
echo -e "${GREEN}✅ Edge Functions server starting...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start Edge Functions with environment variables
supabase functions serve --env-file "$ENV_FILE_TO_USE" --no-verify-jwt
