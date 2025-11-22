# Testing Guide

## Overview

This project uses **Vitest** as the testing framework, which is optimized for Vite projects and provides fast, ESM-first testing.

## Test Structure

```
src/test/
├── setup.ts                    # Test configuration and global setup
├── mocks/                      # Mock implementations
│   ├── supabase.ts            # Supabase client mocks
│   └── cdp.ts                 # CDP SDK mocks
├── fixtures/                   # Test data fixtures
│   └── serverWallets.ts       # Server wallet test data
├── utils/                     # Test utilities
│   └── testHelpers.ts         # Helper functions
├── integration/              # Integration tests
│   └── edgeFunctions.test.ts # Edge Function integration tests
├── e2e/                       # End-to-end tests
│   └── serverWalletFlow.test.ts
└── serverWallets.test.ts      # Unit tests for server wallets
```

## Running Tests

### All Tests
```bash
pnpm test
```

### Watch Mode (for development)
```bash
pnpm test:watch
```

### Test UI (interactive)
```bash
pnpm test:ui
```

### Coverage Report
```bash
pnpm test:coverage
```

### Integration Tests Only
```bash
pnpm test:integration
```

### E2E Tests Only
```bash
pnpm test:e2e
```

## Test Types

### 1. Unit Tests

Test individual functions and utilities in isolation.

**Location**: `src/test/*.test.ts`

**Example**:
```typescript
import { describe, it, expect } from 'vitest';

describe('createServerWallet', () => {
  it('should create a wallet successfully', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests

Test Edge Functions with real Supabase instance (requires local setup).

**Location**: `src/test/integration/`

**Prerequisites**:
- Supabase running locally: `supabase start`
- Edge Functions serving: `supabase functions serve`
- Database migrations applied: `supabase db push`

**Example**:
```typescript
describe('Edge Functions Integration', () => {
  it('should create wallet via Edge Function', async () => {
    const result = await supabase.functions.invoke('create-wallet', {
      body: { userAddress: '0x...' },
    });
    expect(result.data).toBeDefined();
  });
});
```

### 3. E2E Tests

Test complete user flows and interactions.

**Location**: `src/test/e2e/`

**Example**:
```typescript
describe('Server Wallet E2E Flow', () => {
  it('should automatically create wallet when user connects', async () => {
    // Simulate full user flow
  });
});
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Using Mocks

```typescript
import { createMockSupabaseClient } from '../mocks/supabase';

const mockSupabase = createMockSupabaseClient();
mockSupabase.functions.invoke.mockResolvedValue({
  data: { result: 'success' },
  error: null,
});
```

### Using Fixtures

```typescript
import { mockServerWallet } from '../fixtures/serverWallets';

const wallet = mockServerWallet;
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/testHelpers';

it('should render component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Test Configuration

### Vitest Config (`vitest.config.ts`)

- **Environment**: `jsdom` (for React component testing)
- **Setup File**: `src/test/setup.ts`
- **Coverage**: V8 provider with HTML, JSON, and text reports

### Environment Variables

Tests use mocked environment variables defined in `src/test/setup.ts`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CDP_API_KEY`
- `VITE_CDP_API_SECRET`

For integration tests, use real values from `.env` file.

## Mock Data

### Supabase Mocks

Located in `src/test/mocks/supabase.ts`:
- Mock Supabase client
- Mock function invocations
- Mock database queries

### CDP SDK Mocks

Located in `src/test/mocks/cdp.ts`:
- Mock wallet creation
- Mock transaction sending
- Mock wallet import

## Test Fixtures

Located in `src/test/fixtures/`:
- `serverWallets.ts` - Server wallet test data
- Reusable test data structures
- Mock API responses

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Mocks**: Mock external dependencies (APIs, databases)
3. **Test Behavior**: Test what the code does, not implementation details
4. **Clear Names**: Use descriptive test names
5. **Arrange-Act-Assert**: Structure tests clearly
6. **Clean Up**: Clean up after tests (use `afterEach`, `afterAll`)

## Continuous Integration

Tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: pnpm test
```

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure dependencies are installed: `pnpm install`
- Check import paths are correct

### Integration tests fail
- Verify Supabase is running: `supabase status`
- Check Edge Functions are serving: `supabase functions serve`
- Ensure database migrations are applied

### Coverage not generating
- Run: `pnpm test:coverage`
- Check `coverage/` directory

## Next Steps

- [ ] Add component tests for React components
- [ ] Add hook tests for custom hooks
- [ ] Add visual regression tests
- [ ] Set up CI/CD test automation
- [ ] Add performance tests

