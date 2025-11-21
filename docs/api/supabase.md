# Supabase API Reference

## Client Initialization

The Supabase client is initialized in `src/lib/supabase.ts` using the Supabase JavaScript client library. It creates a singleton client instance using the Supabase URL and anonymous key from environment variables, with fallback values for development.

## Database Schema

### proposals Table

The proposals table stores DAO proposals for creator coin purchases. Each proposal has a unique ID, references a DAO address and proposal ID, contains creator information (address and username), includes title and description, has an optional cover image URL, tracks status, and records creation and update timestamps. The table enforces uniqueness on the combination of dao_address and proposal_id, and has indexes on dao_address and status for query performance.

### votes Table

The votes table records user votes on proposals. Each vote has a unique ID, references a proposal via foreign key, stores the voter's wallet address, records the vote type (for, against, or abstain), optionally stores a transaction hash, tracks voting power used, and records when the vote was cast. The table enforces that vote_type must be one of the three valid options, ensures one vote per user per proposal through a unique constraint, and has indexes on proposal_id and voter_address for query performance.

## Type Definitions

TypeScript types are exported from `src/lib/supabase.ts`. The Proposal type includes all proposal fields with nullable types for optional fields like creator_username, description, and cover_image_url. The Vote type includes all vote fields with vote_type as a union type of the three valid options.

## Query Patterns

### Fetching Active Proposals

The useProposals hook queries Supabase for proposals matching the configured DAO address with active status, ordered by creation date descending. It filters by dao_address (lowercased) and status equals 'active', then orders results by created_at descending.

### Inserting Votes

The useVoting hook inserts votes into the votes table. It includes the proposal ID, voter address from Wagmi (lowercased), vote type, hardcoded voting power of 1, and a mock transaction hash generated from the current timestamp.

### Fetching Votes

Votes can be queried by proposal_id to get all votes for a specific proposal, or by voter_address to get a user's voting history. Both queries use the indexed columns for performance.

## Row Level Security (RLS)

Row Level Security is enabled on both tables. For proposals, anyone can read, insert, and update proposals. For votes, anyone can read votes and insert votes, and users can update votes. Currently, vote inserts are not restricted to authenticated users, and there is no rate limiting or voting power verification.

## Error Handling

Supabase queries return an error object if something goes wrong. The application checks for errors and throws them, which are caught by try-catch blocks in the hooks. Error types include network errors, RLS policy violations, constraint violations like unique or check constraints, and invalid queries.

## Current Implementation Details

Addresses are normalized to lowercase before storing in the database for consistency. Nullable fields like creator_username, description, and cover_image_url are handled as optional in TypeScript. Queries use indexed columns (dao_address, status, proposal_id, voter_address) for performance.

## Related Documentation

- [Database Schema](../database/schema.md) - Full schema reference
- [Migrations](../database/migrations.md) - Migration guide
- [Architecture Overview](../architecture/overview.md) - System architecture
