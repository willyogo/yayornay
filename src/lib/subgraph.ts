// Subgraph utilities for fetching Builder DAO auction data
// Configure via VITE_BUILDER_DAO_SUBGRAPH_URL environment variable

import { DAO_ADDRESS } from '../config/constants';

// Default to the Goldsky public endpoint for Base Mainnet Builder DAO
const DEFAULT_SUBGRAPH_URL =
  'https://api.goldsky.com/api/public/project_cm33ek8kjx6pz010i2c3w8z25/subgraphs/nouns-builder-base-mainnet/latest/gn';

export type SubgraphAuction = {
  id: string; // nounId
  startTime: string;
  endTime: string;
  settled: boolean;
  // Builder DAO subgraph uses nested bid objects instead of direct fields
  highestBid?: {
    amount: string;
    bidder: string;
  } | null;
  winningBid?: {
    amount: string;
    bidder: string;
  } | null;
};

const getSubgraphEndpoint = (): string | null => {
  // Check for environment variable (Vite uses import.meta.env)
  const url =
    import.meta.env.VITE_BUILDER_DAO_SUBGRAPH_URL ||
    import.meta.env.VITE_SUBGRAPH_URL;
  return url || DEFAULT_SUBGRAPH_URL;
};

async function gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const endpoint = getSubgraphEndpoint();
  if (!endpoint) {
    throw new Error('Subgraph endpoint not configured');
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
        auctions(first: 1, orderBy: startTime, orderDirection: desc, where: {settled: false}) {
          id
          startTime
          endTime
          settled
          highestBid {
            amount
            bidder
          }
          winningBid {
            amount
            bidder
          }
        }
      }`
    );
    
    // If no active auction, get the latest settled one
    if (!data.auctions || data.auctions.length === 0) {
      const settledData = await gql<{ auctions: SubgraphAuction[] }>(
        `query LatestSettledAuction {
          auctions(first: 1, orderBy: startTime, orderDirection: desc, where: {settled: true}) {
            id
            startTime
            endTime
            settled
            highestBid {
              amount
              bidder
            }
            winningBid {
              amount
              bidder
            }
          }
        }`
      );
      return settledData.auctions?.[0] ?? null;
    }
    
    return data.auctions[0];
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
    // Builder DAO subgraph uses compound IDs: "daoAddress:tokenId"
    const tokenId = typeof nounId === 'string' ? nounId : String(nounId);
    const compoundId = `${DAO_ADDRESS.toLowerCase()}:${tokenId}`;
    
    const data = await gql<{ auctions: SubgraphAuction[] }>(
      `query AuctionById($id: ID!) {
        auctions(where: { id: $id }) {
          id
          startTime
          endTime
          settled
          highestBid {
            amount
            bidder
          }
          winningBid {
            amount
            bidder
          }
        }
      }`,
      { id: compoundId }
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

