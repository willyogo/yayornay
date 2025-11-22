# Documentation Index

Welcome to the YayOrNay documentation. This directory contains comprehensive technical documentation organized by topic.

## 📚 Documentation Structure

### [Architecture](./architecture/)
Core architectural documentation and design decisions.

- **[Overview](./architecture/overview.md)** - System architecture, tech stack, and high-level design
- **[Components](./architecture/components.md)** - Component hierarchy, patterns, and responsibilities
- **[Data Flow](./architecture/data-flow.md)** - How data moves through the application
- **[State Management](./architecture/state-management.md)** - State management patterns and strategies

### [Guides](./guides/)
Step-by-step guides for common tasks.

- **[Quick Start](./guides/quickstart.md)** - Get up and running in 5 minutes
- **[Installation](./guides/installation.md)** - Dependency installation and setup
- **[Development Setup](./guides/development.md)** - Local development environment setup
- **[Testing](./guides/testing.md)** - Testing framework and test suite guide
- **[Local Testing](./guides/testing-local.md)** - Local testing guide for server wallets
- **[Server Wallets Setup](./guides/server-wallets-setup.md)** - Complete server wallets implementation guide
- **[Production Deployment](./guides/production-deployment.md)** - Complete production deployment guide
- **[Wallet Encryption](./guides/wallet-encryption-setup.md)** - Wallet data encryption setup
- **[Checking Wallets](./guides/checking-wallets.md)** - How to verify server wallets exist
- **[Contributing](./guides/contributing.md)** - Contribution guidelines and workflow

### [Integrations](./integrations/)
Integration setup and implementation guides.

- **[Zora Integration](./integrations/zora.md)** - Zora Coins SDK integration setup

### [Features](./)
Feature-specific documentation.

- **[Nouns Auction Integration](./nouns-auction-integration.md)** - Auction integration details

### [API Reference](./api/)
Documentation for external APIs and integrations.

- **[Supabase](./api/supabase.md)** - Database client and queries
- **[Subgraph](./api/subgraph.md)** - Builder DAO subgraph integration
- **[Zora](./api/zora.md)** - Zora API integration
- **[Wagmi](./api/wagmi.md)** - Blockchain integration (Wagmi/Viem)

### [Database](./database/)
Database schema and migration documentation.

- **[Schema](./database/schema.md)** - Database schema reference
- **[Migrations](./database/migrations.md)** - Migration history and guide

### [Diagrams](./diagrams/)
Visual architecture diagrams and flowcharts.

- **[Architecture Diagrams](./diagrams/architecture.md)** - System and component diagrams

## 🚀 Quick Start

New to the codebase? Start here:

1. Read the [Architecture Overview](./architecture/overview.md)
2. Set up your [Development Environment](./guides/development.md)
3. Explore the [Component Architecture](./architecture/components.md)

## 📝 Document Conventions

- **Code examples** use TypeScript/TSX
- **File paths** are relative to project root
- **API endpoints** are documented with examples
- **Diagrams** use ASCII art or Mermaid syntax

## 🔄 Keeping Docs Updated

When making changes:

- Update relevant architecture docs when changing component structure
- Update API docs when changing integration patterns
- Update guides when changing setup/deployment processes
- Add migration notes when changing database schema

## 📖 Additional Resources

- [Project README](../README.md) - Project overview and setup
- [Package.json](../package.json) - Dependencies and scripts

