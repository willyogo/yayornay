import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { CONTRACTS } from '../config/contracts';

// ERC721 balanceOf function ABI
const ERC721_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function useNounBalance() {
  const { address } = useAccount();

  const { data: balance, isLoading, error } = useReadContract({
    address: CONTRACTS.NFT,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: balance ? Number(balance) : 0,
    hasNoun: (balance ? Number(balance) : 0) > 0,
    isLoading,
    error,
  };
}

