import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onComplete?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date().getTime();
  const target = targetDate.getTime();
  const total = target - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(new Date(targetDate))
  );

  useEffect(() => {
    const target = new Date(targetDate);

    const updateTimer = () => {
      const remaining = calculateTimeRemaining(target);
      setTimeRemaining(remaining);

      if (remaining.total <= 0 && onComplete) {
        onComplete();
      }
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (timeRemaining.total <= 0) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg">
        <Clock className="w-4 h-4" />
        <span>Voting is now open!</span>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
        <Clock className="w-3.5 h-3.5" />
        <span>Voting opens in:</span>
      </div>
      <div className="flex items-center gap-2">
        {timeRemaining.days > 0 && (
          <div className="flex flex-col items-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2 border border-blue-200/50 min-w-[60px]">
            <span className="text-2xl font-bold text-gray-900">{formatNumber(timeRemaining.days)}</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wide">Days</span>
          </div>
        )}
        <div className="flex flex-col items-center bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg px-3 py-2 border border-purple-200/50 min-w-[60px]">
          <span className="text-2xl font-bold text-gray-900">{formatNumber(timeRemaining.hours)}</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-wide">Hours</span>
        </div>
        <div className="flex flex-col items-center bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg px-3 py-2 border border-pink-200/50 min-w-[60px]">
          <span className="text-2xl font-bold text-gray-900">{formatNumber(timeRemaining.minutes)}</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-wide">Mins</span>
        </div>
        <div className="flex flex-col items-center bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg px-3 py-2 border border-orange-200/50 min-w-[60px]">
          <span className="text-2xl font-bold text-gray-900">{formatNumber(timeRemaining.seconds)}</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-wide">Secs</span>
        </div>
      </div>
    </div>
  );
}
