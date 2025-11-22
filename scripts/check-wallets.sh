#!/bin/bash
# Check if server wallets exist for given user addresses
# Usage: ./scripts/check-wallets.sh [user_address1] [user_address2] ...

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase is running
if ! curl -s http://localhost:54321/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Supabase not running. Start it with: supabase start${NC}"
  exit 1
fi

# Get anon key from .env or .env.local
ENV_FILE=""
if [ -f .env ]; then
  ENV_FILE=".env"
elif [ -f .env.local ]; then
  ENV_FILE=".env.local"
else
  echo -e "${RED}❌ No .env or .env.local file found${NC}"
  exit 1
fi

ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$ENV_FILE" | cut -d '=' -f2 | tr -d '\"' | tr -d "'" | head -1)

if [ -z "$ANON_KEY" ]; then
  echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY not set in $ENV_FILE${NC}"
  exit 1
fi

# Get Supabase URL
SUPABASE_URL=$(grep VITE_SUPABASE_URL "$ENV_FILE" | cut -d '=' -f2 | tr -d '\"' | tr -d "'" | head -1)
if [ -z "$SUPABASE_URL" ]; then
  SUPABASE_URL="http://localhost:54321"
fi

echo -e "${BLUE}🔍 Checking Server Wallets${NC}"
echo -e "${BLUE}===========================${NC}"
echo ""

# If addresses provided, check those; otherwise check all
if [ $# -eq 0 ]; then
  echo -e "${YELLOW}📋 No addresses provided. Checking all wallets in database...${NC}"
  echo ""
  
  # Query all wallets via Supabase REST API
  RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/server_wallets?select=user_address,server_wallet_address,network_id,created_at&order=created_at.desc" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY")
  
  WALLET_COUNT=$(echo "$RESPONSE" | jq '. | length' 2>/dev/null || echo "0")
  
  if [ "$WALLET_COUNT" = "0" ] || [ -z "$WALLET_COUNT" ]; then
    echo -e "${YELLOW}⚠️  No wallets found in database${NC}"
  else
    echo -e "${GREEN}✅ Found $WALLET_COUNT wallet(s):${NC}"
    echo ""
    echo "$RESPONSE" | jq -r '.[] | "  👤 User: \(.user_address)\n  💼 Server Wallet: \(.server_wallet_address)\n  🌐 Network: \(.network_id)\n  📅 Created: \(.created_at)\n"' 2>/dev/null || echo "$RESPONSE"
  fi
else
  # Check specific addresses
  for USER_ADDRESS in "$@"; do
    echo -e "${BLUE}🔍 Checking wallet for: ${USER_ADDRESS}${NC}"
    
    # Normalize address to lowercase
    NORMALIZED_ADDRESS=$(echo "$USER_ADDRESS" | tr '[:upper:]' '[:lower:]')
    
    # Check via Edge Function (recommended)
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/get-wallet" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"userAddress\": \"$NORMALIZED_ADDRESS\"}")
    
    if echo "$RESPONSE" | grep -q "serverWalletAddress"; then
      echo -e "${GREEN}✅ Wallet exists!${NC}"
      echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    elif echo "$RESPONSE" | grep -q "not found"; then
      echo -e "${RED}❌ Wallet not found${NC}"
    else
      echo -e "${YELLOW}⚠️  Unexpected response:${NC}"
      echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    fi
    echo ""
  done
fi

echo -e "${BLUE}===========================${NC}"


