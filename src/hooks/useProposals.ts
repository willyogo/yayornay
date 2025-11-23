import { useState, useEffect } from 'react';
import { Proposal } from '../lib/supabase';
import { AI_AGENT_ADDRESS, DAO_ADDRESS } from '../config/constants';
import { fetchActiveProposalsFromSubgraph, fetchPendingProposalsFromSubgraph, fetchUnvotedProposalsForUser, SubgraphProposal } from '../lib/yaynaySubgraph';

const PURCHASE_TITLE_REGEX = /purchase\s+[a-zA-Z0-9._-]+['']s creator coin/i;
const TITLE_CREATOR_REGEX = /purchase\s+([a-zA-Z0-9._-]+)['']s creator coin/i;
const HANDLE_REGEX = /@([a-zA-Z0-9._-]+)/;
const COIN_ADDRESS_REGEX = /address:\s*(0x[a-fA-F0-9]{40})/i;
const COIN_SYMBOL_REGEX = /symbol:\s*([a-zA-Z0-9._-]+)/i;
const ETH_AMOUNT_REGEX = /eth amount:\s*([0-9]*\.?[0-9]+\s*(?:eth)?)/i;
const SUMMARY_PURCHASE_REGEX = /purchase\s+([0-9]*\.?[0-9]+)\s*eth[^a-zA-Z0-9]+(?:worth\s+of\s+)?([a-zA-Z0-9._-]+)/i;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const AGENT_PROPOSER_ADDRESS = AI_AGENT_ADDRESS.toLowerCase();

const testCreators = [
  '@bloodpiano',
  '@empresstrash',
  '@jessepollak',
  '@skatehacker',
  '@k4lana',
  '@r4to',
  '@gianinaskarlett',
  '@willywonka',
  '@pixiekate',
  '@realitycrafter',
  '@lauracielie',
  '@pau_unik',
  '@alex_masmej',
  '@gnericvibes'
];

const descriptions = [
  'A talented creator building innovative content and growing their community on Base.',
  'Established creator with strong engagement and authentic community connection.',
  'Emerging talent creating unique content that resonates with the creator economy.',
  'Creative innovator pushing boundaries in digital content and community building.',
  'Prolific creator with a track record of high-quality output and community growth.',
  'Rising star in the creator space with excellent community engagement.',
  'Authentic voice creating compelling content and building a loyal following.',
  'Visionary creator experimenting with new formats and engaging their audience.',
  'Community-focused creator building lasting connections through their work.',
  'Innovative content creator with a unique perspective and growing influence.',
  'Talented artist creating memorable experiences for their community.',
  'Creative professional with consistent output and strong community trust.',
  'Pioneering creator exploring new frontiers in digital content.',
  'Dynamic creator building bridges between communities through their work.'
];

const mockProposals: Proposal[] = testCreators.map((creator, index) => ({
  id: `mock-${index + 1}`,
  dao_address: DAO_ADDRESS.toLowerCase(),
  proposal_id: `test-${index + 1}`,
  creator_address: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
  creator_username: creator,
  title: `Should the DAO purchase 1 ETH of $${creator.replace('@', '')}?`,
  description: descriptions[index],
  cover_image_url: `https://images.pexels.com/photos/${[1194420, 1763075, 159581, 2102587, 3184291, 3184338, 3184339, 3184360, 3184418, 3184465, 3184611, 3184613, 3184614, 3184634][index]}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`,
  status: 'active',
  proposer_address: AGENT_PROPOSER_ADDRESS,
  vote_start: new Date(Date.now() - index * 86400000).toISOString(),
  created_at: new Date(Date.now() - index * 86400000).toISOString(),
  updated_at: new Date(Date.now() - index * 86400000).toISOString()
}));

const toIsoFromSeconds = (value?: string | number | null) => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (numeric === undefined || numeric === null || Number.isNaN(numeric)) {
    return new Date().toISOString();
  }
  return new Date(numeric * 1000).toISOString();
};

const buildProposalId = (proposal: SubgraphProposal) => {
  if (proposal.proposalId) return proposal.proposalId;
  if (proposal.proposalNumber !== undefined && proposal.proposalNumber !== null) {
    return `proposal-${proposal.proposalNumber}`;
  }
  if (proposal.transactionHash) {
    return proposal.transactionHash;
  }
  return `proposal-${proposal.proposer}-${proposal.voteStart}`;
};

type ParsedProposalMetadata = {
  coinAddress: string | null;
  symbol: string | null;
  ethAmount: string | null;
};

const formatEthAmount = (raw?: string | null) => {
  if (!raw) return null;
  const cleaned = raw.trim();
  const withoutUnit = cleaned.replace(/\s*eth$/i, '').trim();
  const amount = withoutUnit || cleaned;
  return `${amount} ETH`;
};

const parseProposalMetadata = (proposal: SubgraphProposal): ParsedProposalMetadata => {
  const description = proposal.description || '';
  const title = proposal.title || '';

  const addressMatch = description.match(COIN_ADDRESS_REGEX)?.[1];
  const symbolMatch =
    description.match(COIN_SYMBOL_REGEX)?.[1] ||
    title.match(TITLE_CREATOR_REGEX)?.[1] ||
    null;

  const ethAmountMatch =
    description.match(ETH_AMOUNT_REGEX)?.[1] ||
    title.match(ETH_AMOUNT_REGEX)?.[1] ||
    null;

  const summaryMatch =
    description.match(SUMMARY_PURCHASE_REGEX) || title.match(SUMMARY_PURCHASE_REGEX);

  const fallbackSymbol = summaryMatch?.[2] || null;
  const fallbackEthAmount = summaryMatch?.[1] || null;

  return {
    coinAddress: addressMatch ? addressMatch.toLowerCase() : null,
    symbol: (symbolMatch || fallbackSymbol)?.trim() || null,
    ethAmount: formatEthAmount(ethAmountMatch || fallbackEthAmount),
  };
};

const extractCreatorHandle = (proposal: SubgraphProposal, parsed: ParsedProposalMetadata) => {
  const title = proposal.title || '';
  const descriptionHandle = proposal.description?.match(HANDLE_REGEX)?.[1];
  const titleHandle = title.match(TITLE_CREATOR_REGEX)?.[1];
  const handle =
    descriptionHandle ||
    (PURCHASE_TITLE_REGEX.test(title) ? titleHandle : null) ||
    parsed.symbol;

  if (!handle) return null;
  if (handle.startsWith('@') || handle.startsWith('0x')) return handle;
  return `@${handle}`;
};

const normalizeSubgraphProposal = (proposal: SubgraphProposal, isPending: boolean = false): Proposal => {
  const parsed = parseProposalMetadata(proposal);
  const creatorHandle = extractCreatorHandle(proposal, parsed);
  const proposalId = buildProposalId(proposal);
  const symbolForTitle =
    parsed.symbol ||
    (creatorHandle && !creatorHandle.startsWith('0x')
      ? creatorHandle.replace(/^@/, '')
      : null);
  const computedTitle =
    parsed.ethAmount && symbolForTitle
      ? `Should the DAO purchase ${parsed.ethAmount} of $${symbolForTitle}?`
      : proposal.title || `Proposal #${proposal.proposalNumber ?? proposalId}`;

  return {
    id: proposalId,
    dao_address: (proposal.dao?.governorAddress || DAO_ADDRESS).toLowerCase(),
    proposal_id: proposal.proposalId || proposalId,
    creator_address: (parsed.coinAddress || proposal.proposer || ZERO_ADDRESS).toLowerCase(),
    creator_username: creatorHandle,
    title: computedTitle,
    description: proposal.description || null,
    cover_image_url: null,
    status: isPending ? 'pending' : 'active',
    proposer_address: (proposal.proposer || ZERO_ADDRESS).toLowerCase(),
    vote_start: toIsoFromSeconds(proposal.voteStart),
    created_at: toIsoFromSeconds(proposal.timeCreated),
    updated_at: toIsoFromSeconds(proposal.voteEnd || proposal.expiresAt || proposal.timeCreated),
  };
};

export function useProposals(testMode: boolean = false, userAddress?: string) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function fetchProposals() {
      setLoading(true);
      setError(null);

      try {
        // Fetch both active and pending proposals
        let activeProposals: SubgraphProposal[];
        let pendingProposals: SubgraphProposal[] = [];

        if (userAddress) {
          // Fetch only proposals the user hasn't voted on
          activeProposals = await fetchUnvotedProposalsForUser(userAddress);
        } else {
          // Fetch all active proposals
          activeProposals = await fetchActiveProposalsFromSubgraph();
        }

        // Always fetch pending proposals
        try {
          pendingProposals = await fetchPendingProposalsFromSubgraph();
        } catch (pendingErr) {
          console.warn('Failed to fetch pending proposals:', pendingErr);
          // Continue with just active proposals if pending fetch fails
        }

        if (isActive) {
          const totalProposals = activeProposals.length + pendingProposals.length;

          if (totalProposals > 0) {
            // Combine active and pending proposals
            const normalizedActive = activeProposals.map(p => normalizeSubgraphProposal(p, false));
            const normalizedPending = pendingProposals.map(p => normalizeSubgraphProposal(p, true));

            const filteredActive = normalizedActive.filter(
              (proposal) => proposal.proposer_address.toLowerCase() === AGENT_PROPOSER_ADDRESS
            );
            const filteredPending = normalizedPending.filter(
              (proposal) => proposal.proposer_address.toLowerCase() === AGENT_PROPOSER_ADDRESS
            );

            // Sort by vote_start time (soonest first for pending, then active)
            const allProposals = [...filteredPending, ...filteredActive].sort((a, b) => {
              const timeA = new Date(a.vote_start || a.created_at).getTime();
              const timeB = new Date(b.vote_start || b.created_at).getTime();
              return timeA - timeB;
            });

            setProposals(allProposals);
          } else if (testMode) {
            // Fallback to mock proposals only in test mode if no subgraph proposals found
            setProposals(mockProposals);
          } else {
            // No proposals found from subgraph and not in test mode
            setProposals([]);
          }
        }
      } catch (err) {
        if (isActive) {
          // If subgraph query fails and we're in test mode, use mocks
          if (testMode) {
            setProposals(mockProposals);
          } else {
            setProposals([]);
            setError(err instanceof Error ? err.message : 'Failed to fetch proposals from subgraph');
          }
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    fetchProposals();

    return () => {
      isActive = false;
    };
  }, [testMode, userAddress, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { proposals, loading, error, refetch };
}
