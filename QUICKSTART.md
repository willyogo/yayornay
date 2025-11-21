# Quick Start Guide

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **pnpm** (recommended) or **npm**
- A web browser with Coinbase Wallet extension (for wallet connection)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw
VITE_CDP_API_KEY=a142a893-a9b1-4b3c-bbbd-b609c06dd145
# Optional: Custom Base Sepolia RPC (defaults to https://sepolia.base.org)
# VITE_BASE_SEPOLIA_RPC_URL=https://your-custom-rpc-url.com
```

**Note:** These are default values already in the code. You can use them for testing, but for production you should use your own credentials.

**Important:** The app is configured for **Base Sepolia testnet** (chain ID 84532). Make sure your wallet is connected to Base Sepolia to interact with the testnet contracts.

### 3. Start Development Server

```bash
pnpm dev
# or
npm run dev
```

The app will open at **http://localhost:5173**

## What You'll See

1. **Landing Page** - "Swipe to Govern" with Login and "Become a Voter" buttons
2. **Auction Page** - Click "Become a Voter" to see the live auction (if wallet not connected)
3. **Voting Interface** - After connecting wallet, you'll see the swipe interface

## Using Test Mode

The app has a test mode toggle (top right) that shows mock proposals without needing:
- Database connection
- Real proposals
- Wallet connection (for viewing proposals)

Enable test mode to explore the UI without setup.

## Troubleshooting

### Port Already in Use
```bash
# Vite will try to use the next available port, or you can specify:
pnpm dev --port 3000
```

### Wallet Connection Issues
- Install [Coinbase Wallet](https://www.coinbase.com/wallet) browser extension
- Make sure you're on Base network (or testnet if using testnet contracts)

### TypeScript Errors
```bash
pnpm typecheck
```

### Linting Errors
```bash
pnpm lint
```

## Next Steps

- Read the [Development Guide](./docs/guides/development.md) for detailed setup
- Check [Architecture Docs](./docs/architecture/overview.md) to understand the codebase
- Explore the auction page to see live contract data

