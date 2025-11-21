// Subgraph utilities for fetching Builder DAO auction data
// Configure via VITE_BUILDER_DAO_SUBGRAPH_URL environment variable

export type SubgraphAuction = {
  id: string; // nounId
  amount: string;
  startTime: string;
  endTime: string;
  settled: boolean;
  bidder?: { id: string } | null;
};

const getSubgraphEndpoint = (): string | null => {
  // Check for environment variable (Vite uses import.meta.env)
  const url =
    import.meta.env.VITE_BUILDER_DAO_SUBGRAPH_URL ||
    import.meta.env.VITE_SUBGRAPH_URL;
  return url || null;
};

async function gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const endpoint = getSubgraphEndpoint();
  if (!endpoint) {
    throw new Error('Subgraph endpoint not configured. Set VITE_BUILDER_DAO_SUBGRAPH_URL');
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Subgraph error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Subgraph errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

/**
 * Fetch the latest auction from the subgraph
 */
export async function fetchLatestAuction(): Promise<SubgraphAuction | null> {
  try {
    const data = await gql<{ auctions: SubgraphAuction[] }>(
      `query LatestAuction {
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
      }`
    );
    return data.auctions?.[0] ?? null;
  } catch (error) {
    console.warn('Failed to fetch latest auction from subgraph:', error);
    return null;
  }
}

/**
 * Fetch a specific auction by nounId from the subgraph
 */
export async function fetchAuctionById(
  nounId: bigint | number | string
): Promise<SubgraphAuction | null> {
  try {
    const id = typeof nounId === 'string' ? nounId : String(nounId);
    const data = await gql<{ auctions: SubgraphAuction[] }>(
      `query AuctionById($id: ID!) {
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
      }`,
      { id }
    );
    return data.auctions?.[0] ?? null;
  } catch (error) {
    console.warn(`Failed to fetch auction ${nounId} from subgraph:`, error);
    return null;
  }
}

/**
 * Check if subgraph is configured
 */
export function isSubgraphConfigured(): boolean {
  return getSubgraphEndpoint() !== null;
}

