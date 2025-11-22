import { VoteType } from '../hooks/useVoting';

export type QueuedVote = {
  proposalId: string;
  voteType: VoteType;
  timestamp: number;
  voterAddress: string;
};

const VOTE_QUEUE_KEY = 'yaynay_vote_queue';

/**
 * Get all queued votes from localStorage
 */
export function getQueuedVotes(): QueuedVote[] {
  try {
    const stored = localStorage.getItem(VOTE_QUEUE_KEY);
    if (!stored) return [];
    const votes = JSON.parse(stored) as QueuedVote[];
    // Filter out votes older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return votes.filter(vote => vote.timestamp > sevenDaysAgo);
  } catch (error) {
    console.error('Error reading vote queue:', error);
    return [];
  }
}

/**
 * Add a vote to the queue
 */
export function queueVote(proposalId: string, voteType: VoteType, voterAddress: string): void {
  try {
    const votes = getQueuedVotes();
    const newVote: QueuedVote = {
      proposalId,
      voteType,
      timestamp: Date.now(),
      voterAddress: voterAddress.toLowerCase(),
    };
    
    // Remove any existing vote for this proposal from this voter
    const filtered = votes.filter(
      v => !(v.proposalId === proposalId && v.voterAddress === voterAddress.toLowerCase())
    );
    
    votes.push(newVote);
    localStorage.setItem(VOTE_QUEUE_KEY, JSON.stringify([...filtered, newVote]));
  } catch (error) {
    console.error('Error queueing vote:', error);
  }
}

/**
 * Remove a vote from the queue
 */
export function dequeueVote(proposalId: string, voterAddress: string): void {
  try {
    const votes = getQueuedVotes();
    const filtered = votes.filter(
      v => !(v.proposalId === proposalId && v.voterAddress === voterAddress.toLowerCase())
    );
    localStorage.setItem(VOTE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error dequeuing vote:', error);
  }
}

/**
 * Clear all votes from the queue
 */
export function clearVoteQueue(): void {
  try {
    localStorage.removeItem(VOTE_QUEUE_KEY);
  } catch (error) {
    console.error('Error clearing vote queue:', error);
  }
}

/**
 * Get queued votes for a specific voter
 */
export function getQueuedVotesForVoter(voterAddress: string): QueuedVote[] {
  const votes = getQueuedVotes();
  return votes.filter(v => v.voterAddress === voterAddress.toLowerCase());
}

