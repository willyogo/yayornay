#!/bin/bash
# Enhanced wallet creation test with debugging

echo "🔍 Debugging wallet creation..."
echo ""

# Check if Supabase is running
if ! curl -s http://localhost:54321/health > /dev/null 2>&1; then
  echo "❌ Supabase not running. Start it with: supabase start"
  exit 1
fi

# Get anon key from .env or .env.local
ENV_FILE=""
if [ -f .env ]; then
  ENV_FILE=".env"
elif [ -f .env.local ]; then
  ENV_FILE=".env.local"
else
  echo "❌ No .env or .env.local file found"
  exit 1
fi

echo "📁 Using env file: $ENV_FILE"
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$ENV_FILE" | cut -d '=' -f2 | tr -d '\"' | tr -d "'" | head -1)
CDP_KEY=$(grep VITE_CDP_API_KEY "$ENV_FILE" | cut -d '=' -f2 | tr -d '\"' | tr -d "'" | head -1)
CDP_SECRET=$(grep VITE_CDP_API_SECRET "$ENV_FILE" | cut -d '=' -f2 | tr -d '\"' | tr -d "'" | head -1)

echo "🔑 Environment check:"
echo "   ANON_KEY: ${ANON_KEY:0:20}... (${#ANON_KEY} chars)"
echo "   CDP_KEY: ${CDP_KEY:0:20}... (${#CDP_KEY} chars)"
echo "   CDP_SECRET: ${CDP_SECRET:0:20}... (${#CDP_SECRET} chars)"
echo ""

if [ -z "$ANON_KEY" ]; then
  echo "❌ VITE_SUPABASE_ANON_KEY not set in $ENV_FILE"
  exit 1
fi

if [ -z "$CDP_KEY" ] || [ -z "$CDP_SECRET" ]; then
  echo "⚠️  CDP credentials missing in $ENV_FILE"
  echo "   Edge Functions need these to be available when serving"
  echo ""
  echo "💡 Solution: Restart Edge Functions with env file:"
  echo "   supabase functions serve --env-file $ENV_FILE"
  echo ""
fi

# Test wallet creation
echo "📤 Calling create-wallet function..."
RESPONSE=$(curl -s -X POST http://localhost:54321/functions/v1/create-wallet \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}')

echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "serverWalletAddress"; then
  echo "✅ Wallet created successfully!"
elif echo "$RESPONSE" | grep -q "Missing CDP API credentials"; then
  echo "❌ Edge Functions can't access CDP credentials"
  echo ""
  echo "💡 Fix: Restart Edge Functions with:"
  echo "   supabase functions serve --env-file $ENV_FILE"
  echo ""
  echo "   Or create a .env file (not .env.local):"
  echo "   cp $ENV_FILE .env"
else
  echo "❌ Wallet creation failed"
fi

