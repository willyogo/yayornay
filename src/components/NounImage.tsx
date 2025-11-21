'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACTS } from '../config/contracts';

type Props = {
  nounId: bigint | number;
  className?: string;
  priority?: boolean;
};

// Use SVG from noun.pics for crisp pixel art at any size (fallback).
const nounPicsUrl = (nounId: bigint) => `https://noun.pics/${nounId.toString()}.svg`;

// ERC721 tokenURI ABI
const ERC721_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const resolveTokenUriImage = async (nounId: bigint): Promise<string> => {
  try {
    const tokenUri = await publicClient.readContract({
      address: CONTRACTS.NFT,
      abi: ERC721_ABI,
      functionName: 'tokenURI',
      args: [nounId],
    });

    if (typeof tokenUri !== 'string') {
      throw new Error('Invalid tokenURI format');
    }

    // Handle data URI formats
    if (tokenUri.startsWith('data:application/json;base64,')) {
      const [, base64] = tokenUri.split(',');
      const json = JSON.parse(atob(base64));
      if (typeof json.image === 'string') {
        return json.image as string;
      }
    }

    if (tokenUri.startsWith('data:application/json;utf8,')) {
      const json = JSON.parse(tokenUri.split(',')[1] ?? '{}');
      if (typeof json.image === 'string') {
        return json.image as string;
      }
    }

    // If tokenURI is a direct URL, return it
    if (tokenUri.startsWith('http://') || tokenUri.startsWith('https://') || tokenUri.startsWith('ipfs://')) {
      return tokenUri;
    }

    // If it's a data URI image, return it directly
    if (tokenUri.startsWith('data:image/')) {
      return tokenUri;
    }

    // Fallback to noun.pics if we can't parse it
    console.warn('Could not parse tokenURI, falling back to noun.pics', tokenUri);
    return nounPicsUrl(nounId);
  } catch (error) {
    console.warn('Failed to load Noun tokenURI, falling back to noun.pics', error);
    // Fallback to a fast CDN image if on-chain data-uri fails
    return nounPicsUrl(nounId);
  }
};

const NounImage: React.FC<Props> = ({ nounId, className, priority }) => {
  const nounIdBigInt = BigInt(nounId);

  const { data: tokenImage, isLoading } = useQuery({
    queryKey: ['noun-image', nounIdBigInt.toString(), CONTRACTS.NFT],
    queryFn: async () => {
      // Try to get image from contract tokenURI first
      return resolveTokenUriImage(nounIdBigInt);
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const alt = `Noun ${nounIdBigInt.toString()}`;

  if (isLoading || !tokenImage) {
    return (
      <img
        src="/noun-loading-skull.gif"
        alt="Loading Noun artwork"
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }

  const isDataUri = tokenImage.startsWith('data:');

  return (
    <img
      src={tokenImage}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      aria-hidden={false}
      style={{ imageRendering: isDataUri ? 'pixelated' : 'auto' }}
    />
  );
};

export default NounImage;

