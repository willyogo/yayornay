export function CardSkeleton() {
  return (
    <div className="absolute inset-0 bg-white z-30 flex flex-col">
      {/* Creator section skeleton */}
      <div className="px-6 py-4 flex items-center gap-3">
        {/* Avatar skeleton */}
        <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />

        {/* Name skeleton */}
        <div className="min-w-0 flex-1">
          <div className="h-7 bg-gray-200 rounded-lg animate-pulse w-3/4" />
        </div>
      </div>

      {/* Title and stats section */}
      <div className="px-5 pt-0 pb-2 flex flex-col justify-between">
        {/* Title skeleton */}
        <div className="space-y-2 mb-2">
          <div className="h-5 bg-gray-200 rounded-lg animate-pulse w-full" />
          <div className="h-5 bg-gray-200 rounded-lg animate-pulse w-2/3" />
        </div>

        {/* Stats grid skeleton - 2x2 grid matching StatsGrid component */}
        <div className="grid grid-cols-2 gap-3">
          {/* Market Cap skeleton */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-3.5 w-3.5 bg-blue-200 rounded animate-pulse" />
              <div className="h-3 bg-blue-200 rounded animate-pulse w-16" />
            </div>
            <div className="h-6 bg-blue-200 rounded animate-pulse w-16" />
          </div>

          {/* Holders skeleton */}
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-3.5 w-3.5 bg-amber-200 rounded animate-pulse" />
              <div className="h-3 bg-amber-200 rounded animate-pulse w-12" />
            </div>
            <div className="h-6 bg-amber-200 rounded animate-pulse w-10" />
          </div>

          {/* 24h Volume skeleton */}
          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-3.5 w-3.5 bg-purple-200 rounded animate-pulse" />
              <div className="h-3 bg-purple-200 rounded animate-pulse w-16" />
            </div>
            <div className="h-6 bg-purple-200 rounded animate-pulse w-14" />
          </div>

          {/* 24h Change skeleton */}
          <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-3.5 w-3.5 bg-gray-300 rounded animate-pulse" />
              <div className="h-3 bg-gray-300 rounded animate-pulse w-16" />
            </div>
            <div className="h-6 bg-gray-300 rounded animate-pulse w-12" />
          </div>
        </div>
      </div>

      {/* Image grid skeleton - 2x2 grid matching gridCoins layout */}
      <div className="w-full px-5 pt-2 pb-5 grid grid-cols-2 auto-rows-fr gap-3">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="relative rounded-xl overflow-hidden bg-gray-200 aspect-square animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
