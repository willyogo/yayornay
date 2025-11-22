#!/bin/bash
# Start Edge Functions with environment variables loaded

echo "🚀 Starting Edge Functions with environment variables..."

# Check if .env exists
if [ ! -f .env ]; then
  if [ -f .env.local ]; then
    echo "📋 Copying .env.local to .env..."
    cp .env.local .env
  else
    echo "❌ No .env or .env.local file found"
    exit 1
  fi
fi

echo "📁 Using .env file"
echo "🔑 Loading environment variables..."

# Start Edge Functions with env file
supabase functions serve --env-file .env

