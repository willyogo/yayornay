# Test Suite Quick Reference

## Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run all tests**:
   ```bash
   pnpm test
   ```

3. **Watch mode** (for development):
   ```bash
   pnpm test:watch
   ```

## Test Files

- `serverWallets.test.ts` - Unit tests for server wallet utilities
- `integration/edgeFunctions.test.ts` - Integration tests (requires local Supabase)
- `e2e/serverWalletFlow.test.ts` - End-to-end flow tests

## Mocks & Fixtures

- `mocks/supabase.ts` - Supabase client mocks
- `mocks/cdp.ts` - CDP SDK mocks
- `fixtures/serverWallets.ts` - Test data fixtures

## Running Specific Tests

```bash
# Run only unit tests
pnpm test src/test/serverWallets.test.ts

# Run only integration tests (requires Supabase running)
pnpm test:integration

# Run with coverage
pnpm test:coverage

# Interactive UI
pnpm test:ui
```

## Integration Test Setup

Integration tests require:
1. Supabase running: `supabase start`
2. Edge Functions serving: `supabase functions serve`
3. Migrations applied: `supabase db push`

Then run:
```bash
pnpm test:integration
```

