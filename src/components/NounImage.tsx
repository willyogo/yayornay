'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

type Props = {
  nounId: bigint | number;
  className?: string;
  priority?: boolean;
};

// Use SVG from noun.pics for crisp pixel art at any size.
const nounPicsUrl = (nounId: bigint) => `https://noun.pics/${nounId.toString()}.svg`;

const NounImage: React.FC<Props> = ({ nounId, className, priority }) => {
  const nounIdBigInt = BigInt(nounId);

  const { data: tokenImage, isLoading } = useQuery({
    queryKey: ['noun-image', nounIdBigInt.toString()],
    queryFn: async () => {
      // For Builder DAO, use noun.pics pattern
      return nounPicsUrl(nounIdBigInt);
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const alt = `Noun ${nounIdBigInt.toString()}`;

  if (isLoading || !tokenImage) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={tokenImage}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      aria-hidden={false}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default NounImage;

