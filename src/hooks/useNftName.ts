import { useReadContract } from 'wagmi';
import { CONTRACTS } from '../config/contracts';

// Minimal NFT name ABI
const NFT_NAME_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/**
 * Hook to fetch the NFT collection name
 * Returns the name of the NFT contract (e.g., "Yay or Nay (test)")
 */
export function useNftName() {
  const { data: name, isLoading } = useReadContract({
    address: CONTRACTS.NFT,
    abi: NFT_NAME_ABI,
    functionName: 'name',
    query: {
      staleTime: 1000 * 60 * 60, // Cache for 1 hour - name doesn't change
    },
  });

  return {
    name: name || 'Noun',
    isLoading,
  };
}
