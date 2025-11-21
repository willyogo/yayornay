# Database Schema

## Overview

The application uses Supabase (PostgreSQL) as the primary database. The schema consists of two main tables: proposals and votes.

## Tables

### proposals

The proposals table stores information about DAO proposals for creator coin purchases. Each proposal has a unique ID, references a DAO address and proposal ID, contains creator information including address and optional username, includes title and optional description, has an optional cover image URL, tracks status with a default of 'active', and records creation and update timestamps.

The table enforces uniqueness on the combination of dao_address and proposal_id to prevent duplicate proposals. Indexes exist on dao_address and status for query performance.

Status values include 'active' for proposals that can be voted on, 'executed' for proposals that passed and were executed, 'defeated' for proposals that were defeated, and 'cancelled' for proposals that were cancelled.

### votes

The votes table records user votes on proposals. Each vote has a unique ID, references a proposal via foreign key with cascade delete, stores the voter's wallet address, records the vote type which must be one of 'for', 'against', or 'abstain', optionally stores a transaction hash, tracks voting power used with a default of 0, and records when the vote was cast.

The table enforces a unique constraint on the combination of proposal_id and voter_address, ensuring one vote per user per proposal. A check constraint ensures vote_type is one of the three valid options. Indexes exist on proposal_id and voter_address for query performance.

## Relationships

The relationship between proposals and votes is one-to-many: one proposal can have many votes, and each vote belongs to one proposal. When a proposal is deleted, all its votes are automatically deleted due to the cascade delete constraint.

## Row Level Security (RLS)

Row Level Security is enabled on both tables. For the proposals table, anyone can read proposals, anyone can insert proposals, and anyone can update proposals. For the votes table, anyone can read votes, anyone can insert votes, and users can update votes. Currently, vote inserts are not restricted to authenticated users, and there is no rate limiting or voting power validation.

## Indexes

Performance indexes exist on dao_address for fast DAO filtering, status for fast status filtering, proposal_id for fast join performance, and voter_address for fast user vote lookup.

## TypeScript Types

TypeScript types are exported from src/lib/supabase.ts. The Proposal type includes all proposal fields with nullable types for optional fields. The Vote type includes all vote fields with vote_type as a union type of the three valid options.

## Common Queries

Active proposals are queried by filtering on dao_address and status equals 'active', ordered by created_at descending. Votes for a proposal are queried by proposal_id, ordered by voted_at descending. User votes are queried by voter_address, ordered by voted_at descending. Vote counts can be aggregated by vote_type for a given proposal.

## Related Documentation

- [Supabase API Reference](../api/supabase.md) - Query patterns and examples
- [Migrations](./migrations.md) - Migration guide
- [Architecture Overview](../architecture/overview.md) - System architecture
