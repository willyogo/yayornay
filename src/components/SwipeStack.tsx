import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { X, Heart, MoveUp } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { ProposalCard } from './ProposalCard';
import { VoteType } from '../hooks/useVoting';
import { prefetchZoraCoinData } from '../hooks/useZoraCoin';
import { getQueuedVotesForVoter } from '../lib/voteQueue';

interface SwipeStackProps {
  proposals: Proposal[];
  onVote: (proposalId: string, voteType: VoteType) => Promise<void>;
  onSubmitCreator: () => void;
  testMode?: boolean;
}

const NEXT_PROPOSAL_DELAY_MS = 12 * 60 * 1000; // 12 minutes

export function SwipeStack({ proposals, onVote, testMode, onSubmitCreator }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isPromotingNext, setIsPromotingNext] = useState(false);
  const [activeVote, setActiveVote] = useState<VoteType | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const activeInputType = useRef<'mouse' | 'touch' | null>(null);
  const animationLock = useRef(false);
  const [timeUntilNext, setTimeUntilNext] = useState(NEXT_PROPOSAL_DELAY_MS);
  const { address } = useAccount();

  const votedProposalIds = useMemo(() => {
    if (!address) return new Set<string>();
    const votes = getQueuedVotesForVoter(address);
    return new Set(votes.map((vote) => vote.proposalId));
  }, [address, currentIndex, proposals]);

  const availableProposals = useMemo(
    () => proposals.filter((proposal) => !votedProposalIds.has(proposal.id)),
    [proposals, votedProposalIds]
  );

  const currentProposal = availableProposals[currentIndex];

  const resetCardPosition = () => {
    setDragOffset({ x: 0, y: 0 });
    setActiveVote(null);
  };

  const getFlyOutOffset = (voteType: VoteType) => {
    const travel = Math.max(window.innerWidth, window.innerHeight) * 0.85;

    if (voteType === 'for') {
      return { x: travel, y: dragOffset.y * 0.35 };
    }

    if (voteType === 'against') {
      return { x: -travel, y: dragOffset.y * 0.35 };
    }

    return { x: dragOffset.x * 0.25, y: -travel };
  };

  const handleVote = async (voteType: VoteType) => {
    if (!currentProposal || animationLock.current) return;

    animationLock.current = true;
    activePointerId.current = null;
    activeInputType.current = null;
    setIsDragging(false);
    setIsAnimatingOut(true);
    setIsPromotingNext(true);
    setActiveVote(voteType);
    setDragOffset(getFlyOutOffset(voteType));

    if (!testMode) {
      try {
        await onVote(currentProposal.id, voteType);
      } catch (error) {
        console.error('Vote error:', error);
        animationLock.current = false;
        setIsAnimatingOut(false);
        setIsPromotingNext(false);
        resetCardPosition();
        return;
      }
    }

    setTimeout(() => {
      setTransitionEnabled(false);
      setCurrentIndex((prev) => prev + 1);
      resetCardPosition();
      setIsAnimatingOut(false);
      setIsPromotingNext(false);
      animationLock.current = false;
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
    }, 400);
  };

  const handleDragStart = (
    clientX: number,
    clientY: number,
    pointerId: number,
    type: 'mouse' | 'touch'
  ) => {
    if (animationLock.current) return;

    activePointerId.current = pointerId;
    activeInputType.current = type;
    setIsDragging(true);
    setActiveVote(null);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || animationLock.current) return;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    setDragOffset({ x: deltaX, y: deltaY });

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const upwardPull = deltaY < -20;

    let voteIntent: VoteType | null = null;

    if (absY > absX && upwardPull) {
      voteIntent = 'abstain';
    } else if (absX > 20) {
      voteIntent = deltaX > 0 ? 'for' : 'against';
    }

    setActiveVote(voteIntent);

    const horizontalEdge = absX > window.innerWidth * 0.32;
    const verticalEdge = deltaY < -window.innerHeight * 0.24;

    if ((horizontalEdge || verticalEdge) && voteIntent) {
      handleVote(voteIntent);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging || animationLock.current) return;

    activePointerId.current = null;
    activeInputType.current = null;
    setIsDragging(false);

    const horizontalThreshold = 110;
    const verticalThreshold = 120;
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);

    if (absY > absX && dragOffset.y < -verticalThreshold) {
      handleVote('abstain');
      return;
    }

    if (dragOffset.x > horizontalThreshold) {
      handleVote('for');
      return;
    }

    if (dragOffset.x < -horizontalThreshold) {
      handleVote('against');
      return;
    }

    resetCardPosition();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (activeInputType.current !== 'mouse') return;
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      if (activeInputType.current !== 'mouse') return;
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (activeInputType.current !== 'touch') return;
      const touch = Array.from(e.touches).find(
        (t) => t.identifier === activePointerId.current
      );
      if (!touch) return;
      e.preventDefault();
      handleDragMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeInputType.current !== 'touch') return;
      const match = Array.from(e.changedTouches).some(
        (t) => t.identifier === activePointerId.current
      );
      if (!match) return;
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging]);

  // Prefetch the next few proposals' coin data so the cards can render instantly when promoted
  useEffect(() => {
    const idsToPrefetch = [currentIndex + 1, currentIndex + 2, currentIndex + 3]
      .map((i) => availableProposals[i]?.creator_username || availableProposals[i]?.creator_address)
      .filter(Boolean) as string[];

    idsToPrefetch.forEach((id) => {
      prefetchZoraCoinData(id);
    });
  }, [currentIndex, availableProposals]);

  useEffect(() => {
    if (!availableProposals.length) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => Math.min(prev, availableProposals.length - 1));
  }, [availableProposals.length]);

  const latestProposalStart = useMemo(() => {
    if (!proposals.length) return null;

    const timestamps = proposals
      .map((proposal) => {
        const date = new Date(proposal.vote_start || proposal.created_at || proposal.updated_at);
        return date.getTime();
      })
      .filter((value) => Number.isFinite(value)) as number[];

    if (!timestamps.length) return null;
    return Math.max(...timestamps);
  }, [proposals]);

  const nextProposalTimestamp = useMemo(() => {
    if (!latestProposalStart) {
      return Date.now() + NEXT_PROPOSAL_DELAY_MS;
    }
    return latestProposalStart + NEXT_PROPOSAL_DELAY_MS;
  }, [latestProposalStart]);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(nextProposalTimestamp - Date.now(), 0);
      setTimeUntilNext(remaining);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [nextProposalTimestamp]);

  const formatTimeRemaining = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (currentIndex >= availableProposals.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-6 text-center">
          <div className="space-y-3">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900">All caught up!</h2>
            <p className="text-gray-600">You've voted on all active proposals.</p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-3xl shadow-lg p-6 space-y-4 text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">Next proposal in</p>
            <p className="text-4xl font-mono font-semibold text-gray-900">
              {formatTimeRemaining(timeUntilNext)}
            </p>
            <p className="text-xs text-gray-500">
              A new proposal is submitted every 12 minutes
            </p>

            {timeUntilNext <= 1000 && (
              <div className="text-sm text-blue-600 font-medium">
                Next proposal should appear any moment now.
              </div>
            )}

            <button
              onClick={onSubmitCreator}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-md hover:shadow-lg transition-transform hover:scale-[1.01] active:scale-95"
            >
              Submit a Creator
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProposal) {
    return null;
  }

  const rotation = Math.max(Math.min(dragOffset.x / 15, 15), -15);
  const supportOpacity = Math.min(1, Math.abs(dragOffset.x) / 140);
  const abstainOpacity = Math.min(1, Math.max(0, -dragOffset.y) / 140);
  const visibleProposals = availableProposals.slice(currentIndex, currentIndex + 2);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 relative max-w-md w-full mx-auto p-4 min-h-[520px]">
        {visibleProposals.map((proposal, idx) => {
          const isTopCard = idx === 0;
          const transform = isTopCard
            ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
            : isPromotingNext
              ? 'scale(1) translateY(0)'
              : 'scale(0.95) translateY(10px)';
          const transition = isTopCard
            ? isDragging || !transitionEnabled
              ? 'none'
              : 'transform 0.35s cubic-bezier(.22,.61,.36,1)'
            : 'transform 220ms cubic-bezier(.22,.61,.36,1), opacity 220ms ease';

          return (
            <div
              key={proposal.id}
              ref={isTopCard ? cardRef : undefined}
              className={`absolute inset-0 ${isTopCard ? 'z-10 w-full h-full transition-transform will-change-transform touch-none select-none cursor-grab active:cursor-grabbing' : 'z-0 w-full h-full pointer-events-none'}`}
              style={{
                transform,
                transition,
                opacity: isTopCard ? 1 : isPromotingNext ? 0.95 : 0.5,
                pointerEvents: isTopCard && !isAnimatingOut ? 'auto' : 'none',
              }}
              draggable={false}
              onDragStart={isTopCard ? (e) => e.preventDefault() : undefined}
              onMouseDown={
                isTopCard
                  ? (e) => {
                      if (e.button !== 0) return;
                      handleDragStart(e.clientX, e.clientY, -1, 'mouse');
                    }
                  : undefined
              }
              onTouchStart={
                isTopCard
                  ? (e) => {
                      const touch = e.touches[0];
                      if (!touch) return;
                      handleDragStart(touch.clientX, touch.clientY, touch.identifier ?? 0, 'touch');
                    }
                  : undefined
              }
            >
              <div className="card-content relative w-full h-full cursor-grab active:cursor-grabbing">
                <ProposalCard proposal={proposal} />
              </div>

              {isTopCard && dragOffset.x > 40 && (
                <div
                  className="absolute top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl rotate-12 shadow-xl"
                  style={{ opacity: activeVote === 'for' ? 1 : supportOpacity }}
                >
                  SUPPORT
                </div>
              )}

              {isTopCard && dragOffset.x < -40 && (
                <div
                  className="absolute top-8 left-8 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl -rotate-12 shadow-xl"
                  style={{ opacity: activeVote === 'against' ? 1 : supportOpacity }}
                >
                  PASS
                </div>
              )}

              {isTopCard && dragOffset.y < -40 && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-xl"
                  style={{ opacity: activeVote === 'abstain' ? 1 : abstainOpacity }}
                >
                  ABSTAIN
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center items-center gap-6 p-8">
        <button
          onClick={() => handleVote('against')}
          className="w-16 h-16 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
        >
          <X className="w-8 h-8 text-red-600" />
        </button>

        <button
          onClick={() => handleVote('abstain')}
          className="w-14 h-14 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
        >
          <MoveUp className="w-6 h-6 text-blue-600" />
        </button>

        <button
          onClick={() => handleVote('for')}
          className="w-16 h-16 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
        >
          <Heart className="w-8 h-8 text-green-600" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
