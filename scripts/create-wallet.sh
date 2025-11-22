#!/bin/bash
# Create server wallets for user addresses
# Usage: ./scripts/create-wallet.sh [user_address1] [user_address2] ...

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

# Check if Edge Functions are running
if ! curl -s http://localhost:54321/functions/v1/create-wallet > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Edge Functions might not be running.${NC}"
  echo -e "${YELLOW}💡 Start them with: supabase functions serve${NC}"
  echo ""
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

# Detect environment
IS_PRODUCTION=false
if [[ "$SUPABASE_URL" == *"supabase.co"* ]] || [[ "$SUPABASE_URL" == *"https://"* ]]; then
  IS_PRODUCTION=true
fi

# Show which environment we're using
echo -e "${BLUE}🌐 Environment: ${IS_PRODUCTION:+${RED}PRODUCTION${NC}${BLUE}}${IS_PRODUCTION:-${GREEN}LOCAL${NC}${BLUE}}${NC}"
echo -e "${BLUE}🔗 Supabase URL: ${SUPABASE_URL}${NC}"
echo ""

# Safety check for production
if [ "$IS_PRODUCTION" = true ]; then
  echo -e "${YELLOW}⚠️  WARNING: You are about to create wallets in PRODUCTION!${NC}"
  echo -e "${YELLOW}   This will use real CDP API keys and create real wallets.${NC}"
  echo ""
  read -p "Continue? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Cancelled${NC}"
    exit 1
  fi
  echo ""
fi


# Check if addresses provided
if [ $# -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No addresses provided.${NC}"
  echo ""
  echo "Usage:"
  echo "  ./scripts/create-wallet.sh 0xYourAddress"
  echo "  ./scripts/create-wallet.sh 0xAddress1 0xAddress2 ..."
  echo ""
  echo "Example:"
  echo "  ./scripts/create-wallet.sh 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  exit 1
fi

# Create wallets for each address
SUCCESS_COUNT=0
FAIL_COUNT=0

for USER_ADDRESS in "$@"; do
  echo -e "${BLUE}🔨 Creating wallet for: ${USER_ADDRESS}${NC}"
  
  # Normalize address to lowercase
  NORMALIZED_ADDRESS=$(echo "$USER_ADDRESS" | tr '[:upper:]' '[:lower:]')
  
  # Call create-wallet Edge Function
  RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-wallet" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"userAddress\": \"$NORMALIZED_ADDRESS\"}")
  
  # Check response
  if echo "$RESPONSE" | grep -q "serverWalletAddress"; then
    echo -e "${GREEN}✅ Wallet created successfully!${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    
    # Extract wallet address for summary
    WALLET_ADDRESS=$(echo "$RESPONSE" | jq -r '.serverWalletAddress' 2>/dev/null || echo "N/A")
    WALLET_ID=$(echo "$RESPONSE" | jq -r '.walletId' 2>/dev/null || echo "N/A")
    
    echo -e "${GREEN}   📍 Server Wallet: ${WALLET_ADDRESS}${NC}"
    echo -e "${GREEN}   🆔 Wallet ID: ${WALLET_ID}${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif echo "$RESPONSE" | grep -q "already exists"; then
    echo -e "${YELLOW}⚠️  Wallet already exists for this address${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${RED}❌ Failed to create wallet${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  echo ""
done

# Summary
echo -e "${BLUE}===========================${NC}"
echo -e "${GREEN}✅ Successfully created/verified: ${SUCCESS_COUNT}${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}❌ Failed: ${FAIL_COUNT}${NC}"
fi
echo ""

# Next steps
if [ $SUCCESS_COUNT -gt 0 ]; then
  echo -e "${BLUE}💡 Next steps:${NC}"
  echo "  1. Check wallets: ./scripts/check-wallets.sh"
  echo "  2. Fund wallets with test ETH (Base Sepolia faucet)"
  echo "  3. Test transactions: ./scripts/test-server-wallets.ts"
fi

