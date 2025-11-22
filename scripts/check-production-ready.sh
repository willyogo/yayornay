#!/bin/bash
# Production Readiness Check Script
# Verifies that all requirements are met before deploying to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

echo -e "${BLUE}🚀 Production Readiness Check${NC}"
echo "=================================="
echo ""

# Check if project ref is provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}⚠️  No project ref provided. Checking local setup...${NC}"
  echo ""
  PROJECT_REF="local"
else
  PROJECT_REF=$1
  echo -e "${BLUE}📋 Project Reference: ${PROJECT_REF}${NC}"
  echo ""
fi

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print check result
print_check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
    ALL_CHECKS_PASSED=false
  fi
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================
# 1. Prerequisites Check
# ============================================
echo -e "${BLUE}📦 Prerequisites${NC}"
echo "-------------------"

# Check Supabase CLI
if command_exists supabase; then
  SUPABASE_VERSION=$(supabase --version 2>/dev/null | head -1 || echo "unknown")
  print_check 0 "Supabase CLI installed ($SUPABASE_VERSION)"
else
  print_check 1 "Supabase CLI installed"
fi

# Check if logged in
if supabase projects list &>/dev/null; then
  print_check 0 "Logged in to Supabase"
else
  print_check 1 "Logged in to Supabase (run: supabase login)"
fi

# Check Node.js
if command_exists node; then
  NODE_VERSION=$(node --version)
  print_check 0 "Node.js installed ($NODE_VERSION)"
else
  print_check 1 "Node.js installed"
fi

# Check npm/pnpm
if command_exists pnpm; then
  print_check 0 "pnpm installed"
elif command_exists npm; then
  print_check 0 "npm installed"
else
  print_check 1 "npm or pnpm installed"
fi

echo ""

# ============================================
# 2. Project Link Check
# ============================================
echo -e "${BLUE}🔗 Project Configuration${NC}"
echo "---------------------------"

if [ "$PROJECT_REF" != "local" ]; then
  # Check if project is linked
  if supabase link --project-ref "$PROJECT_REF" --dry-run &>/dev/null || [ -f ".supabase/config.toml" ]; then
    print_check 0 "Project linked to $PROJECT_REF"
  else
    print_warning "Project not linked. Run: supabase link --project-ref $PROJECT_REF"
  fi
else
  print_info "Skipping project link check (local mode)"
fi

echo ""

# ============================================
# 3. Secrets Check
# ============================================
echo -e "${BLUE}🔐 Secrets Configuration${NC}"
echo "---------------------------"

if [ "$PROJECT_REF" != "local" ]; then
  # Check secrets via Supabase CLI
  SECRETS=$(supabase secrets list --project-ref "$PROJECT_REF" 2>/dev/null || echo "")
  
  # Required secrets
  REQUIRED_SECRETS=(
    "VITE_CDP_API_KEY"
    "VITE_CDP_API_SECRET"
    "WALLET_ENCRYPTION_KEY"
  )
  
  # Optional secrets (with warnings)
  OPTIONAL_SECRETS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
  )
  
  for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$SECRETS" | grep -q "$secret"; then
      print_check 0 "$secret is set"
    else
      print_check 1 "$secret is set (REQUIRED)"
    fi
  done
  
  for secret in "${OPTIONAL_SECRETS[@]}"; do
    if echo "$SECRETS" | grep -q "$secret"; then
      print_info "$secret is set (optional, auto-provided by Supabase)"
    else
      print_info "$secret not set (optional, auto-provided by Supabase)"
    fi
  done
else
  # Check local .env files
  if [ -f ".env" ] || [ -f ".env.local" ]; then
    ENV_FILE=""
    if [ -f ".env" ]; then
      ENV_FILE=".env"
    elif [ -f ".env.local" ]; then
      ENV_FILE=".env.local"
    fi
    
    print_info "Checking local .env file: $ENV_FILE"
    
    # Check required vars
    if grep -q "VITE_CDP_API_KEY" "$ENV_FILE" 2>/dev/null; then
      print_check 0 "VITE_CDP_API_KEY in $ENV_FILE"
    else
      print_check 1 "VITE_CDP_API_KEY in $ENV_FILE"
    fi
    
    if grep -q "VITE_CDP_API_SECRET" "$ENV_FILE" 2>/dev/null; then
      print_check 0 "VITE_CDP_API_SECRET in $ENV_FILE"
    else
      print_check 1 "VITE_CDP_API_SECRET in $ENV_FILE"
    fi
    
    if grep -q "WALLET_ENCRYPTION_KEY" "$ENV_FILE" 2>/dev/null; then
      print_check 0 "WALLET_ENCRYPTION_KEY in $ENV_FILE"
    else
      print_warning "WALLET_ENCRYPTION_KEY not in $ENV_FILE (will use default - insecure)"
    fi
  else
    print_check 1 ".env or .env.local file exists"
  fi
fi

echo ""

# ============================================
# 4. Database Migrations Check
# ============================================
echo -e "${BLUE}🗄️  Database Migrations${NC}"
echo "---------------------------"

if [ -d "supabase/migrations" ]; then
  MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" -not -name "placeholder.sql" | wc -l | tr -d ' ')
  print_check 0 "Migrations directory exists ($MIGRATION_COUNT migrations found)"
  
  # Check for required migrations
  REQUIRED_MIGRATIONS=(
    "create_server_wallets_table"
    "create_proposals_and_votes_tables"
  )
  
  for migration in "${REQUIRED_MIGRATIONS[@]}"; do
    if find supabase/migrations -name "*${migration}*" | grep -q .; then
      print_check 0 "Migration found: $migration"
    else
      print_check 1 "Migration found: $migration"
    fi
  done
else
  print_check 1 "Migrations directory exists"
fi

echo ""

# ============================================
# 5. Edge Functions Check
# ============================================
echo -e "${BLUE}⚡ Edge Functions${NC}"
echo "-------------------"

REQUIRED_FUNCTIONS=(
  "create-wallet"
  "get-wallet"
  "send-transaction"
)

for func in "${REQUIRED_FUNCTIONS[@]}"; do
  if [ -d "supabase/functions/$func" ]; then
    if [ -f "supabase/functions/$func/index.ts" ]; then
      print_check 0 "Function exists: $func"
    else
      print_check 1 "Function index.ts exists: $func"
    fi
  else
    print_check 1 "Function directory exists: $func"
  fi
done

# Check for shared crypto utility
if [ -f "supabase/functions/_shared/crypto.ts" ]; then
  print_check 0 "Encryption utility exists (_shared/crypto.ts)"
else
  print_check 1 "Encryption utility exists (_shared/crypto.ts)"
fi

echo ""

# ============================================
# 6. Configuration Check
# ============================================
echo -e "${BLUE}⚙️  Configuration${NC}"
echo "-------------------"

# Check supabase config
if [ -f "supabase/config.toml" ]; then
  print_check 0 "supabase/config.toml exists"
  
  # Check if JWT verification is enabled (production best practice)
  if grep -q 'verify_jwt = true' supabase/config.toml 2>/dev/null; then
    print_info "JWT verification enabled (good for production)"
  else
    print_warning "JWT verification not enabled (consider enabling for production)"
  fi
else
  print_check 1 "supabase/config.toml exists"
fi

# Check deno.json
if [ -f "supabase/functions/deno.json" ]; then
  print_check 0 "deno.json exists"
else
  print_warning "deno.json not found (may cause issues)"
fi

echo ""

# ============================================
# 7. Security Checklist
# ============================================
echo -e "${BLUE}🔒 Security Checklist${NC}"
echo "-------------------"

# Check if .env is in .gitignore
if [ -f ".gitignore" ] && grep -q "^\.env$" .gitignore; then
  print_check 0 ".env is in .gitignore"
else
  print_check 1 ".env is in .gitignore"
fi

# Check if .env.local is ignored
if [ -f ".gitignore" ] && (grep -q "^\.env\.local$" .gitignore || grep -q "^\*\.local$" .gitignore); then
  print_check 0 ".env.local is in .gitignore"
else
  print_check 1 ".env.local is in .gitignore"
fi

# Check if any .env files are tracked
if git ls-files | grep -qE "\.env$|\.env\.local$" 2>/dev/null; then
  print_check 1 "No .env files tracked in git"
else
  print_check 0 "No .env files tracked in git"
fi

# Check encryption implementation
if grep -q "encryptWalletData" supabase/functions/create-wallet/index.ts 2>/dev/null; then
  print_check 0 "Wallet encryption implemented in create-wallet"
else
  print_check 1 "Wallet encryption implemented in create-wallet"
fi

if grep -q "decryptWalletData" supabase/functions/send-transaction/index.ts 2>/dev/null; then
  print_check 0 "Wallet decryption implemented in send-transaction"
else
  print_check 1 "Wallet decryption implemented in send-transaction"
fi

echo ""

# ============================================
# 8. Production Settings Check
# ============================================
echo -e "${BLUE}🏭 Production Settings${NC}"
echo "---------------------------"

# Check if Coinbase-Managed wallets are configured
if grep -q "COINBASE_MANAGED" supabase/functions/create-wallet/index.ts 2>/dev/null; then
  print_info "Coinbase-Managed (2-of-2 MPC) wallets configured"
else
  print_warning "Using Developer-Managed wallets (consider COINBASE_MANAGED for production)"
fi

# Check network configuration
if grep -q "base-mainnet" supabase/functions/create-wallet/index.ts 2>/dev/null; then
  print_info "Network: base-mainnet (production)"
elif grep -q "base-sepolia" supabase/functions/create-wallet/index.ts 2>/dev/null; then
  print_warning "Network: base-sepolia (testnet - change to base-mainnet for production)"
else
  print_warning "Network configuration not clear"
fi

echo ""

# ============================================
# 9. Deployment Status (if project ref provided)
# ============================================
if [ "$PROJECT_REF" != "local" ]; then
  echo -e "${BLUE}🚀 Deployment Status${NC}"
  echo "-------------------"
  
  # Check if functions are deployed
  for func in "${REQUIRED_FUNCTIONS[@]}"; do
    # Try to get function info (this might fail if not deployed)
    if supabase functions list --project-ref "$PROJECT_REF" 2>/dev/null | grep -q "$func"; then
      print_check 0 "Function deployed: $func"
    else
      print_warning "Function deployment status unknown: $func"
    fi
  done
  
  echo ""
fi

# ============================================
# Summary
# ============================================
echo "=================================="
if [ "$ALL_CHECKS_PASSED" = true ]; then
  echo -e "${GREEN}✅ All critical checks passed!${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "1. Review warnings above"
  echo "2. Deploy migrations: supabase db push"
  echo "3. Deploy functions: ./scripts/deploy-production.sh $PROJECT_REF"
  echo "4. Test deployment with a test wallet creation"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please fix the issues above before deploying.${NC}"
  echo ""
  echo -e "${BLUE}Common fixes:${NC}"
  echo "- Set missing secrets: supabase secrets set KEY=value"
  echo "- Link project: supabase link --project-ref $PROJECT_REF"
  echo "- Add .env to .gitignore if missing"
  exit 1
fi


