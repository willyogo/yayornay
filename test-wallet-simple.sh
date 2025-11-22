#!/bin/bash
# Simple wallet creation test

echo "🧪 Testing wallet creation..."

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
  echo "💡 Create a .env file with VITE_SUPABASE_ANON_KEY"
  exit 1
fi

ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$ENV_FILE" | cut -d '=' -f2 | tr -d '\"' | tr -d "'" | head -1)

if [ -z "$ANON_KEY" ]; then
  echo "❌ VITE_SUPABASE_ANON_KEY not set in .env"
  exit 1
fi

# Test wallet creation
echo "📤 Calling create-wallet function..."
RESPONSE=$(curl -s -X POST http://localhost:54321/functions/v1/create-wallet \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}')

echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q "serverWalletAddress"; then
  echo "✅ Wallet created successfully!"
else
  echo "❌ Wallet creation failed"
fi
