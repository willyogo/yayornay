# Subgraph API Reference

## Overview

The application uses Builder DAO subgraphs to fetch auction and proposal data. Subgraphs provide faster reads, historical data access, and reduce on-chain query load. The implementation uses a **subgraph-first approach** with contract fallback.

## Configuration

Subgraph endpoints are configured via environment variables:

- `VITE_BUILDER_DAO_SUBGRAPH_URL` - Primary subgraph URL for auction data
- `VITE_SUBGRAPH_URL` - Alternative subgraph URL (fallback)
- `VITE_YAYNAY_SUBGRAPH_URL` - Subgraph URL for proposal data (used in `yaynaySubgraph.ts`)

If no environment variable is set, the subgraph functions will throw an error or return null (depending on the function).

## Auction Subgraph (`src/lib/subgraph.ts`)

### Type Definitions

```typescript
export type SubgraphAuction = {
  id: string; // nounId
  amount: string;
  startTime: string;
  endTime: string;
  settled: boolean;
  bidder?: { id: string } | null;
};
```

### Functions

#### `fetchLatestAuction()`

Fetches the most recent auction from the subgraph.

**Returns:** `Promise<SubgraphAuction | null>`

**GraphQL Query:**
```graphql
query LatestAuction {
  auctions(first: 1, orderBy: startTime, orderDirection: desc) {
    id
    amount
    startTime
    endTime
    settled
    bidder {
      id
    }
  }
}
```

**Usage:**
```typescript
const auction = await fetchLatestAuction();
if (auction) {
  // Transform to Auction type
  const auctionData: Auction = {
    nounId: BigInt(auction.id),
    amount: BigInt(auction.amount),
    startTime: BigInt(auction.startTime),
    endTime: BigInt(auction.endTime),
    bidder: (auction.bidder?.id ?? ZERO_ADDRESS) as `0x${string}`,
    settled: Boolean(auction.settled),
  };
}
```

#### `fetchAuctionById(nounId)`

Fetches a specific auction by nounId.

**Parameters:**
- `nounId: bigint | number | string` - The noun ID to fetch

**Returns:** `Promise<SubgraphAuction | null>`

**GraphQL Query:**
```graphql
query AuctionById($id: ID!) {
  auctions(where: { id: $id }) {
    id
    amount
    startTime
    endTime
    settled
    bidder {
      id
    }
  }
}
```

**Usage:**
```typescript
const auction = await fetchAuctionById(10);
```

#### `isSubgraphConfigured()`

Checks if subgraph endpoint is configured.

**Returns:** `boolean`

**Usage:**
```typescript
if (isSubgraphConfigured()) {
  // Use subgraph
} else {
  // Fall back to contract
}
```

## Proposal Subgraph (`src/lib/yaynaySubgraph.ts`)

### Type Definitions

```typescript
export type SubgraphProposal = {
  abstainVotes: string;
  againstVotes: string;
  calldatas: string[];
  description?: string | null;
  descriptionHash?: string | null;
  executableFrom?: string | null;
  expiresAt?: string | null;
  forVotes: string;
  proposalId: string;
  proposalNumber?: string | number | null;
  proposalThreshold?: string | null;
  proposer: string;
  quorumVotes?: string | null;
  targets: string[];
  timeCreated: string;
  title: string;
  values: string[];
  voteEnd: string;
  voteStart: string;
  snapshotBlockNumber?: string | null;
  transactionHash?: string | null;
  executedAt?: string | null;
  executionTransactionHash?: string | null;
  vetoTransactionHash?: string | null;
  cancelTransactionHash?: string | null;
  dao: {
    governorAddress: string;
    tokenAddress: string;
  };
  votes: SubgraphVote[];
};
```

### Functions

#### `fetchActiveProposalsFromSubgraph(first?, skip?)`

Fetches active proposals from the subgraph.

**Parameters:**
- `first: number` (default: 100) - Number of proposals to fetch
- `skip: number` (default: 0) - Number of proposals to skip (pagination)

**Returns:** `Promise<SubgraphProposal[]>`

**GraphQL Query:**
```graphql
query proposals($where: Proposal_filter, $first: Int!, $skip: Int) {
  proposals(
    where: $where
    first: $first
    skip: $skip
    orderBy: timeCreated
    orderDirection: desc
  ) {
    ...Proposal
    votes {
      ...ProposalVote
    }
  }
}
```

**Usage:**
```typescript
const proposals = await fetchActiveProposalsFromSubgraph(50, 0);
```

## Integration Pattern

The application uses a consistent subgraph-first pattern:

1. **Check Configuration**: Use `isSubgraphConfigured()` to check if subgraph is available
2. **Try Subgraph**: Attempt to fetch from subgraph
3. **Handle Errors**: Catch errors and log warnings
4. **Fallback**: Use contract reads or Supabase queries if subgraph fails

### Example Pattern

```typescript
// In useAuction hook
useEffect(() => {
  if (!isSubgraphConfigured()) {
    setSubgraphLoading(false);
    return;
  }

  const loadSubgraph = async () => {
    try {
      const sg = await fetchLatestAuction();
      if (sg) {
        setSubgraphAuction(transformSubgraphAuction(sg));
      }
    } catch (error) {
      console.warn('Failed to load from subgraph, falling back to on-chain', error);
    } finally {
      setSubgraphLoading(false);
    }
  };

  loadSubgraph();
  const interval = setInterval(loadSubgraph, 15_000);
  return () => clearInterval(interval);
}, []);
```

## Error Handling

Subgraph functions handle errors gracefully:

- **Network Errors**: Caught and logged, function returns `null`
- **GraphQL Errors**: Parsed and logged, function returns `null`
- **Missing Configuration**: Functions throw errors or return `null` depending on context

Components should always handle `null` returns and provide fallback data sources.

## Polling

The `useAuction` hook sets up automatic polling every 15 seconds to refresh auction data from the subgraph. This ensures the UI stays up-to-date with the latest auction state.

## Related Documentation

- [Nouns Auction Integration](../nouns-auction-integration.md) - Auction integration details
- [Data Flow](../architecture/data-flow.md) - How subgraph data flows through the app
- [Architecture Overview](../architecture/overview.md) - System architecture

