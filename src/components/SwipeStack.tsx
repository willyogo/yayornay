import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Heart, MoveUp } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { ProposalCard } from './ProposalCard';
import { VoteType } from '../hooks/useVoting';

interface SwipeStackProps {
  proposals: Proposal[];
  onVote: (proposalId: string, voteType: VoteType) => Promise<void>;
  onDetailClick: (proposal: Proposal) => void;
  testMode?: boolean;
}

export function SwipeStack({ proposals, onVote, onDetailClick, testMode }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [activeVote, setActiveVote] = useState<VoteType | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const activeInputType = useRef<'pointer' | 'mouse' | 'touch' | null>(null);
  const animationLock = useRef(false);
  const supportsPointerEvents = useMemo(
    () => typeof window !== 'undefined' && 'PointerEvent' in window,
    []
  );

  const currentProposal = proposals[currentIndex];

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
    if (supportsPointerEvents && activePointerId.current !== null) {
      cardRef.current?.releasePointerCapture(activePointerId.current);
    }
    activePointerId.current = null;
    activeInputType.current = null;
    setIsDragging(false);
    setIsAnimatingOut(true);
    setActiveVote(voteType);
    setDragOffset(getFlyOutOffset(voteType));

    if (!testMode) {
      try {
        await onVote(currentProposal.id, voteType);
      } catch (error) {
        console.error('Vote error:', error);
        animationLock.current = false;
        setIsAnimatingOut(false);
        resetCardPosition();
        return;
      }
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      resetCardPosition();
      setIsAnimatingOut(false);
      animationLock.current = false;
    }, 400);
  };

  const handleDragStart = (clientX: number, clientY: number, source: 'pointer' | 'mouse' | 'touch', pointerId: number) => {
    if (animationLock.current) return;

    activePointerId.current = pointerId;
    activeInputType.current = source;
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

    if (supportsPointerEvents && activePointerId.current !== null) {
      cardRef.current?.releasePointerCapture(activePointerId.current);
    }
    setIsDragging(false);
    activePointerId.current = null;
    activeInputType.current = null;

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

    const handlePointerMove = (e: PointerEvent) => {
      if (activeInputType.current !== 'pointer' || e.pointerId !== activePointerId.current) return;
      handleDragMove(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activeInputType.current !== 'pointer' || e.pointerId !== activePointerId.current) return;
      handleDragEnd();
    };

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

    if (activeInputType.current === 'pointer') {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    } else if (activeInputType.current === 'mouse') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else if (activeInputType.current === 'touch') {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (currentIndex >= proposals.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900">All caught up!</h2>
          <p className="text-gray-600">You've voted on all active proposals</p>
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

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 relative max-w-md w-full mx-auto p-4">
        <div
          ref={cardRef}
          className="relative w-full h-full transition-transform will-change-transform touch-none select-none"
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(.22,.61,.36,1)',
            pointerEvents: isAnimatingOut ? 'none' : 'auto',
          }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (!supportsPointerEvents) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (!(e.target as HTMLElement).closest('.card-content')) return;
            handleDragStart(e.clientX, e.clientY, 'pointer', e.pointerId);
            cardRef.current?.setPointerCapture(e.pointerId);
          }}
          onMouseDown={(e) => {
            if (supportsPointerEvents) return;
            if (e.button !== 0) return;
            if (!(e.target as HTMLElement).closest('.card-content')) return;
            handleDragStart(e.clientX, e.clientY, 'mouse', -1);
          }}
          onTouchStart={(e) => {
            if (supportsPointerEvents) return;
            const touch = e.touches[0];
            if (!touch) return;
            if (!(e.target as HTMLElement).closest('.card-content')) return;
            handleDragStart(touch.clientX, touch.clientY, 'touch', touch.identifier ?? 0);
          }}
        >
          <div className="card-content w-full h-full">
            <ProposalCard
              proposal={currentProposal}
              onDetailClick={() => onDetailClick(currentProposal)}
            />
          </div>

          {dragOffset.x > 40 && (
            <div
              className="absolute top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl rotate-12 shadow-xl"
              style={{ opacity: activeVote === 'for' ? 1 : supportOpacity }}
            >
              SUPPORT
            </div>
          )}

          {dragOffset.x < -40 && (
            <div
              className="absolute top-8 left-8 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl -rotate-12 shadow-xl"
              style={{ opacity: activeVote === 'against' ? 1 : supportOpacity }}
            >
              PASS
            </div>
          )}

          {dragOffset.y < -40 && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-xl"
              style={{ opacity: activeVote === 'abstain' ? 1 : abstainOpacity }}
            >
              ABSTAIN
            </div>
          )}
        </div>

        {proposals[currentIndex + 1] && (
          <div
            className="absolute inset-0 m-4 pointer-events-none"
            style={{
              transform: 'scale(0.95) translateY(10px)',
              opacity: 0.5,
            }}
          >
            <ProposalCard
              proposal={proposals[currentIndex + 1]}
              onDetailClick={() => {}}
            />
          </div>
        )}
      </div>

      <div className="flex justify-center items-center gap-6 p-8 bg-white">
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
