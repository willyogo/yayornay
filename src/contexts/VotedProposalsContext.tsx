import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VotedProposal {
  proposalId: string;
  voteType: 'for' | 'against' | 'abstain';
  timestamp: number;
}

interface VotedProposalsContextType {
  votedProposals: Map<string, VotedProposal>;
  addVotedProposal: (proposalId: string, voteType: 'for' | 'against' | 'abstain') => void;
  hasVoted: (proposalId: string) => boolean;
  clearVotedProposals: () => void;
}

const VotedProposalsContext = createContext<VotedProposalsContextType | undefined>(undefined);

export function VotedProposalsProvider({ children }: { children: ReactNode }) {
  const [votedProposals, setVotedProposals] = useState<Map<string, VotedProposal>>(new Map());

  const addVotedProposal = useCallback((proposalId: string, voteType: 'for' | 'against' | 'abstain') => {
    setVotedProposals((prev) => {
      const next = new Map(prev);
      next.set(proposalId, {
        proposalId,
        voteType,
        timestamp: Date.now(),
      });
      return next;
    });
  }, []);

  const hasVoted = useCallback((proposalId: string) => {
    return votedProposals.has(proposalId);
  }, [votedProposals]);

  const clearVotedProposals = useCallback(() => {
    setVotedProposals(new Map());
  }, []);

  return (
    <VotedProposalsContext.Provider
      value={{
        votedProposals,
        addVotedProposal,
        hasVoted,
        clearVotedProposals,
      }}
    >
      {children}
    </VotedProposalsContext.Provider>
  );
}

export function useVotedProposals() {
  const context = useContext(VotedProposalsContext);
  if (context === undefined) {
    throw new Error('useVotedProposals must be used within a VotedProposalsProvider');
  }
  return context;
}
