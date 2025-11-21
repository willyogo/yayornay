# Development Guide

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **pnpm** or **npm** package manager
- **Git** for version control

## Initial Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd yayornay
```

### 2. Install Dependencies
```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 3. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CDP_API_KEY=your_coinbase_developer_platform_key
```

**Getting Credentials:**

- **Supabase:** Create project at [supabase.com](https://supabase.com)
- **Coinbase Developer Platform:** Get API key from [developer.coinbase.com](https://developer.coinbase.com)

### 4. Database Setup

Run database migrations:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually run migrations
# See supabase/migrations/20251121042518_create_proposals_and_votes_tables.sql
```

### 5. Seed Test Data (Optional)

```bash
# Set environment variables first
export VITE_SUPABASE_URL=your_url
export VITE_SUPABASE_ANON_KEY=your_key

# Run seed script
npx tsx scripts/seed-proposals.ts
```

## Development Workflow

### Start Development Server

```bash
pnpm dev
# or
npm run dev
```

Server runs at `http://localhost:5173` (default Vite port)

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server with HMR

# Building
pnpm build            # Production build
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript type checking
```

### Hot Module Replacement (HMR)

Vite provides instant HMR:
- Component changes reflect immediately
- State is preserved during updates
- Fast refresh for React components

## Project Structure

```
yayornay/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # External service clients
│   └── config/               # Configuration
├── supabase/
│   └── migrations/           # Database migrations
├── scripts/                  # Utility scripts
└── docs/                     # Documentation
```

## Development Patterns

### Adding a New Component

1. Create component file in `src/components/`
2. Export component:
```typescript
// src/components/MyComponent.tsx
export function MyComponent() {
  return <div>Hello</div>;
}
```

3. Import and use:
```typescript
import { MyComponent } from './components/MyComponent';
```

### Adding a New Hook

1. Create hook file in `src/hooks/`
2. Export hook:
```typescript
// src/hooks/useMyHook.ts
export function useMyHook() {
  const [state, setState] = useState();
  return { state };
}
```

### Adding a New API Integration

1. Create client file in `src/lib/`
2. Export client and types:
```typescript
// src/lib/myApi.ts
export const myApiClient = createClient(...);

export interface MyApiType {
  // types
}
```

## TypeScript

### Type Checking

```bash
pnpm typecheck
```

### Type Configuration

- **Strict mode:** Enabled
- **Target:** ES2020
- **Module:** ESNext
- **JSX:** react-jsx

### Type Definitions

Types are defined in:
- `src/lib/supabase.ts` - Database types
- `src/lib/zora.ts` - Zora API types
- Component props - Inline in components

## Code Style

### ESLint

```bash
pnpm lint
```

**Rules:**
- React Hooks rules enforced
- TypeScript recommended rules
- React Refresh plugin

### Formatting

No formatter configured. Consider adding:
- Prettier
- Biome
- dprint

## Testing

### Current State

**No tests implemented**

### Recommended Setup

```bash
# Install Vitest
pnpm add -D vitest @testing-library/react @testing-library/jest-dom

# Add test script
# package.json
"test": "vitest"
```

### Example Test

```typescript
// src/components/__tests__/ProposalCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProposalCard } from '../ProposalCard';

test('renders proposal title', () => {
  const proposal = { /* mock proposal */ };
  render(<ProposalCard proposal={proposal} onDetailClick={() => {}} />);
  expect(screen.getByText(proposal.title)).toBeInTheDocument();
});
```

## Debugging

### React DevTools

Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension

### Wagmi DevTools

Wagmi provides built-in debugging:
- Check wallet connection state
- View transaction history
- Inspect contract calls

### Browser DevTools

- **Console:** Check for errors and warnings
- **Network:** Monitor API calls
- **Application:** Check localStorage (Wagmi state)

## Common Issues

### Wallet Connection Issues

**Problem:** Wallet won't connect

**Solutions:**
- Check Coinbase Wallet extension is installed
- Verify `VITE_CDP_API_KEY` is set correctly
- Check browser console for errors

### Supabase Connection Issues

**Problem:** Can't fetch proposals

**Solutions:**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase project is active
- Verify RLS policies allow reads

### Type Errors

**Problem:** TypeScript errors

**Solutions:**
- Run `pnpm typecheck` to see all errors
- Check type definitions match actual data
- Ensure strict mode compatibility

## Performance Tips

### Development

- Use React DevTools Profiler to identify slow renders
- Check Network tab for unnecessary API calls
- Monitor bundle size with `pnpm build --analyze`

### Optimization

- Use React Query for data caching
- Memoize expensive calculations
- Lazy load heavy components

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Component Architecture](../architecture/components.md)
- [API Reference](../api/)

