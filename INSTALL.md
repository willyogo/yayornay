# Installation Guide

## Dependency Installation

This project uses React 19, which may have peer dependency conflicts with some testing libraries.

### Option 1: Use pnpm (Recommended)

```bash
pnpm install
```

pnpm handles peer dependencies more gracefully than npm.

### Option 2: Use npm with legacy peer deps

If using npm, you may need to use the `--legacy-peer-deps` flag:

```bash
npm install --legacy-peer-deps
```

### Option 3: Use npm with force

As a last resort:

```bash
npm install --force
```

## Why This Happens

- React 19 is newer and some packages haven't updated their peer dependency ranges yet
- `@testing-library/react` may show warnings but should still work with React 19
- The `--legacy-peer-deps` flag tells npm to use the older, more lenient dependency resolution

## After Installation

Once dependencies are installed, verify the setup:

```bash
# Check if tests run
pnpm test

# Or with npm
npm test
```

## Troubleshooting

If you still encounter issues:

1. **Clear cache and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install --legacy-peer-deps
   ```

2. **Use pnpm instead**:
   ```bash
   npm install -g pnpm
   pnpm install
   ```

3. **Check React version compatibility**:
   - Ensure you're using React 19.2.0 or compatible version
   - Some packages may need updates for full React 19 support

