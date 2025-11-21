# Contributing Guide

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit: `git commit -m "Add feature"`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

See [Development Guide](./development.md) for setup instructions.

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` for object types
- Use `type` for unions and intersections
- Export types from data layer (`lib/`)

### React

- Use functional components
- Use hooks for state and side effects
- Keep components small and focused
- Extract reusable logic to custom hooks

### Naming Conventions

- **Components:** PascalCase (`ProposalCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useProposals.ts`)
- **Utilities:** camelCase (`getCreatorProfile.ts`)
- **Constants:** UPPER_SNAKE_CASE (`APP_CONFIG`)

## Commit Messages

Use conventional commits:

```
feat: Add voting power calculation
fix: Fix wallet connection issue
docs: Update architecture documentation
refactor: Extract vote submission logic
test: Add tests for useVoting hook
```

## Pull Request Process

1. **Update Documentation**
   - Update relevant docs if changing architecture
   - Add examples if adding new features

2. **Add Tests** (when applicable)
   - Unit tests for hooks
   - Component tests for UI
   - Integration tests for flows

3. **Check Linting**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

4. **Test Locally**
   - Test wallet connection
   - Test voting flow
   - Test error cases

## Areas for Contribution

### High Priority

- [ ] Implement actual blockchain voting transactions
- [ ] Add voting power calculation from NFT holdings
- [ ] Migrate to React Query for data fetching
- [ ] Add error boundaries
- [ ] Add test coverage

### Medium Priority

- [ ] Add pagination for Zora API
- [ ] Implement vote history view
- [ ] Add treasury holdings dashboard
- [ ] Improve error handling
- [ ] Add loading states

### Low Priority

- [ ] Add animations
- [ ] Improve accessibility
- [ ] Add dark mode
- [ ] Add i18n support

## Related Documentation

- [Development Guide](./development.md) - Setup and workflow
- [Architecture Overview](../architecture/overview.md) - System design

