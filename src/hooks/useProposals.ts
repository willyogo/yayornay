import { useState, useEffect } from 'react';
import { Proposal } from '../lib/supabase';
import { DAO_ADDRESS } from '../config/constants';
import { fetchActiveProposalsFromSubgraph, SubgraphProposal } from '../lib/yaynaySubgraph';

const PURCHASE_TITLE_REGEX = /purchase\s+[a-zA-Z0-9._-]+['']s creator coin/i;
const TITLE_CREATOR_REGEX = /purchase\s+([a-zA-Z0-9._-]+)['']s creator coin/i;
const HANDLE_REGEX = /@([a-zA-Z0-9._-]+)/;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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
  title: `Should the DAO purchase ${creator} creator coin?`,
  description: descriptions[index],
  cover_image_url: `https://images.pexels.com/photos/${[1194420, 1763075, 159581, 2102587, 3184291, 3184338, 3184339, 3184360, 3184418, 3184465, 3184611, 3184613, 3184614, 3184634][index]}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`,
  status: 'active',
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

const extractCreatorHandle = (proposal: SubgraphProposal) => {
  const title = proposal.title || '';
  const descriptionHandle = proposal.description?.match(HANDLE_REGEX)?.[1];
  const titleHandle = title.match(TITLE_CREATOR_REGEX)?.[1];
  const handle = descriptionHandle || (PURCHASE_TITLE_REGEX.test(title) ? titleHandle : null);

  if (!handle) return null;
  return handle.startsWith('@') ? handle : `@${handle}`;
};

const normalizeSubgraphProposal = (proposal: SubgraphProposal): Proposal => {
  const creatorHandle = extractCreatorHandle(proposal);
  const proposalId = buildProposalId(proposal);

  return {
    id: proposalId,
    dao_address: (proposal.dao?.governorAddress || DAO_ADDRESS).toLowerCase(),
    proposal_id: proposal.proposalId || proposalId,
    creator_address: (proposal.proposer || ZERO_ADDRESS).toLowerCase(),
    creator_username: creatorHandle,
    title: proposal.title || `Proposal #${proposal.proposalNumber ?? proposalId}`,
    description: proposal.description || null,
    cover_image_url: null,
    status: 'active',
    vote_start: toIsoFromSeconds(proposal.voteStart),
    created_at: toIsoFromSeconds(proposal.timeCreated),
    updated_at: toIsoFromSeconds(proposal.voteEnd || proposal.expiresAt || proposal.timeCreated),
  };
};

export function useProposals(testMode: boolean = false) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function fetchProposals() {
      setLoading(true);
      setError(null);

      try {
        // Always try to query from subgraph first
        const subgraphProposals = await fetchActiveProposalsFromSubgraph();
        
        if (isActive) {
          if (subgraphProposals.length > 0) {
            // Use proposals from subgraph
            setProposals(subgraphProposals.map(normalizeSubgraphProposal));
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
  }, [testMode]);

  return { proposals, loading, error };
}
