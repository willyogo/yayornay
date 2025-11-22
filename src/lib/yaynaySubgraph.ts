import { APP_CONFIG } from '../config/app';

const DEFAULT_YAYNAY_SUBGRAPH_URL =
  'https://api.goldsky.com/api/public/project_cm33ek8kjx6pz010i2c3w8z25/subgraphs/nouns-builder-base-sepolia/dev/gn';

const PROPOSALS_QUERY = `
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

fragment Proposal on Proposal {
  abstainVotes
  againstVotes
  calldatas
  description
  descriptionHash
  executableFrom
  expiresAt
  forVotes
  proposalId
  proposalNumber
  proposalThreshold
  proposer
  quorumVotes
  targets
  timeCreated
  title
  values
  voteEnd
  voteStart
  snapshotBlockNumber
  transactionHash
  executedAt
  executionTransactionHash
  vetoTransactionHash
  cancelTransactionHash
  dao {
    governorAddress
    tokenAddress
  }
}

fragment ProposalVote on ProposalVote {
  voter
  support
  weight
  reason
}
`;

export type SubgraphVote = {
  voter: string;
  support: number | string;
  weight: string;
  reason?: string | null;
};

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

const getSubgraphEndpoint = () =>
  import.meta.env.VITE_YAYNAY_SUBGRAPH_URL ||
  import.meta.env.VITE_PROPOSALS_SUBGRAPH_URL ||
  DEFAULT_YAYNAY_SUBGRAPH_URL;

async function gql<T>(variables: Record<string, unknown>): Promise<T> {
  const endpoint = getSubgraphEndpoint();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: PROPOSALS_QUERY,
      variables,
    }),
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

export async function fetchActiveProposalsFromSubgraph(
  first: number = 100,
  skip: number = 0
): Promise<SubgraphProposal[]> {
  const now = Math.floor(Date.now() / 1000);
  const where = {
    dao: APP_CONFIG.DAO_ADDRESS.toLowerCase(),
    voteStart_lte: now,
    voteEnd_gt: now,
  };

  const data = await gql<{ proposals: SubgraphProposal[] }>({
    where,
    first,
    skip,
  });

  return data.proposals || [];
}

export function isYayNaySubgraphConfigured() {
  return Boolean(getSubgraphEndpoint());
}
