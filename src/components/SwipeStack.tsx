import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Heart, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { ProposalCard, FlipState } from './ProposalCard';
import { VoteType } from '../hooks/useVoting';
import { prefetchZoraCoinData } from '../hooks/useZoraCoin';
import { useVotedProposals } from '../contexts/VotedProposalsContext';

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
  const [voteStatus, setVoteStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [voteError, setVoteError] = useState<string | null>(null);
  const [cardFlipState, setCardFlipState] = useState<FlipState>('front');
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const activeInputType = useRef<'mouse' | 'touch' | null>(null);
  const animationLock = useRef(false);
  const [timeUntilNext, setTimeUntilNext] = useState(NEXT_PROPOSAL_DELAY_MS);
  const { votedProposals } = useVotedProposals();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    // Initialize on any user interaction
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Play sound effect for vote type
  const playVoteSound = (voteType: VoteType) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    if (voteType === 'for') {
      // Pleasant ascending tone for "YAY"
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = freq;
        osc.type = 'sine';
        
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
        
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } else if (voteType === 'against') {
      // Descending tone for "NAY"
      [392.00, 329.63].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = freq;
        osc.type = 'sine';
        
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    }
  };

  const votedProposalIds = useMemo(() => {
    // Use voted proposals from context (optimistic updates)
    const ids = new Set(votedProposals.keys());
    console.log('[SwipeStack] Voted proposal IDs:', Array.from(ids));
    return ids;
  }, [votedProposals]);

  const availableProposals = useMemo(() => {
    const filtered = proposals.filter((proposal) => !votedProposalIds.has(proposal.id));
    console.log('[SwipeStack] Filtering proposals:', {
      totalProposals: proposals.length,
      votedCount: votedProposalIds.size,
      availableCount: filtered.length,
      proposalIds: proposals.map(p => p.id).slice(0, 5), // First 5
      votedIds: Array.from(votedProposalIds).slice(0, 5), // First 5
    });
    return filtered;
  }, [proposals, votedProposalIds]);

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

    // Don't allow voting on pending proposals
    if (currentProposal.status === 'pending') return;

    // Play sound effect
    playVoteSound(voteType);

    animationLock.current = true;
    activePointerId.current = null;
    activeInputType.current = null;
    setIsDragging(false);
    setIsAnimatingOut(true);
    setIsPromotingNext(true);
    setActiveVote(voteType);
    setDragOffset(getFlyOutOffset(voteType));
    setVoteStatus('submitting');
    setVoteError(null);

    if (!testMode) {
      try {
        await onVote(currentProposal.id, voteType);
        setVoteStatus('success');
      } catch (error) {
        console.error('Vote error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to submit vote';
        setVoteError(errorMessage);
        setVoteStatus('error');
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
      setCardFlipState('front'); // Reset flip state for next card
      setIsAnimatingOut(false);
      setIsPromotingNext(false);
      setVoteStatus('idle');
      setVoteError(null);
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

    // Don't allow dragging on pending proposals
    if (currentProposal?.status === 'pending') return;

    // Don't allow dragging when card is flipped
    if (cardFlipState !== 'front') return;

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

    let voteIntent: VoteType | null = null;

    if (absX > 20) {
      voteIntent = deltaX > 0 ? 'for' : 'against';
    }

    setActiveVote(voteIntent);

    const horizontalEdge = absX > window.innerWidth * 0.32;

    if (horizontalEdge && voteIntent) {
      handleVote(voteIntent);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging || animationLock.current) return;

    activePointerId.current = null;
    activeInputType.current = null;
    setIsDragging(false);

    const horizontalThreshold = 110;

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

  // Calculate next proposal time based on a fixed 12-minute schedule
  // Proposals are submitted at :00, :12, :24, :36, :48 of each hour
  const nextProposalTimestamp = useMemo(() => {
    const now = Date.now();
    const currentDate = new Date(now);
    const currentMinute = currentDate.getMinutes();
    const currentSecond = currentDate.getSeconds();
    const currentMs = currentDate.getMilliseconds();
    
    // Calculate minutes into current 12-minute cycle
    const cycleMinute = currentMinute % 12;
    
    // Calculate ms until next cycle boundary
    const msUntilNext = 
      (12 - cycleMinute - 1) * 60 * 1000 + // remaining full minutes
      (60 - currentSecond) * 1000 + // remaining seconds
      (1000 - currentMs); // remaining milliseconds
    
    return now + msUntilNext;
  }, []);

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
  const visibleProposals = availableProposals.slice(currentIndex, currentIndex + 2);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 relative max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        <div className="relative w-full">
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
              className={`${isTopCard ? `relative z-10 w-full transition-transform will-change-transform touch-none select-none ${cardFlipState === 'front' ? 'cursor-grab active:cursor-grabbing' : ''}` : 'absolute top-0 left-0 right-0 z-0 w-full pointer-events-none'}`}
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
              <div className={`card-content relative w-full ${cardFlipState === 'front' ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <ProposalCard
                  proposal={proposal}
                  onFlipStateChange={isTopCard ? setCardFlipState : undefined}
                />
              </div>

              {isTopCard && dragOffset.x > 40 && (
                <div
                  className="absolute top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl rotate-12 shadow-xl"
                  style={{ opacity: activeVote === 'for' ? 1 : supportOpacity }}
                >
                  YAY
                </div>
              )}

              {isTopCard && dragOffset.x < -40 && (
                <div
                  className="absolute top-8 left-8 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl -rotate-12 shadow-xl"
                  style={{ opacity: activeVote === 'against' ? 1 : supportOpacity }}
                >
                  NAY
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 p-8">
        {/* Vote Status Indicator */}
        {voteStatus !== 'idle' && (
          <div className={`rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium ${
            voteStatus === 'submitting' ? 'bg-blue-50 text-blue-700' :
            voteStatus === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {voteStatus === 'submitting' && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting vote on-chain...
              </>
            )}
            {voteStatus === 'success' && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Vote confirmed!
              </>
            )}
            {voteStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4" />
                {voteError || 'Failed to submit vote'}
              </>
            )}
          </div>
        )}

        {/* Vote Buttons */}
        <div className="flex justify-center items-center gap-6">
          <button
            onClick={() => handleVote('against')}
            disabled={voteStatus === 'submitting' || currentProposal?.status === 'pending'}
            className="w-16 h-16 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <X className="w-8 h-8 text-red-600" />
          </button>

          <button
            onClick={() => handleVote('for')}
            disabled={voteStatus === 'submitting' || currentProposal?.status === 'pending'}
            className="w-16 h-16 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Heart className="w-8 h-8 text-green-600" fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
