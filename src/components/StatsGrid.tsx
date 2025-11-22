import React from 'react';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';

interface StatsGridProps {
  marketCap: string;
  holders: number;
  volume24h: string;
  change24h: number;
  variant?: 'compact' | 'full';
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  marketCap,
  holders,
  volume24h,
  change24h,
  variant = 'compact'
}) => {
  const isPositiveChange = change24h >= 0;
  const changeColor = isPositiveChange ? 'text-green-600' : 'text-red-600';
  const changeTextColor = isPositiveChange ? 'text-green-700' : 'text-red-700';
  const changeBg = isPositiveChange ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100';

  if (variant === 'compact') {
    // Compact 2x2 grid for card front page
    return (
      <div className="grid grid-cols-2 gap-3">
        {/* Market Cap */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[10px] font-medium text-blue-700">Market Cap</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{marketCap}</p>
        </div>

        {/* Holders */}
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[10px] font-medium text-amber-700">Holders</span>
          </div>
          <p className="text-lg font-bold text-amber-600">{holders}</p>
        </div>

        {/* 24h Volume */}
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-[10px] font-medium text-purple-700">24h Volume</span>
          </div>
          <p className="text-lg font-bold text-purple-600">{volume24h}</p>
        </div>

        {/* 24h Change */}
        <div className={`rounded-xl ${changeBg} p-3`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity className={`h-3.5 w-3.5 ${changeColor}`} />
            <span className={`text-[10px] font-medium ${changeTextColor}`}>24h Change</span>
          </div>
          <p className={`text-lg font-bold ${changeColor}`}>
            {isPositiveChange ? '+' : ''}{change24h.toFixed(2)}%
          </p>
        </div>
      </div>
    );
  }

  // Full variant for internal page - side by side layout
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Market Cap */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Market Cap</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{marketCap}</p>
        </div>

        {/* Holders */}
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Holders</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{holders}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 24h Volume */}
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">24h Volume</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{volume24h}</p>
        </div>

        {/* 24h Change */}
        <div className={`rounded-xl ${changeBg} p-3`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className={`h-4 w-4 ${changeColor}`} />
            <span className={`text-xs font-medium ${changeTextColor}`}>24h Change</span>
          </div>
          <p className={`text-xl font-bold ${changeColor}`}>
            {isPositiveChange ? '+' : ''}{change24h.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
};
