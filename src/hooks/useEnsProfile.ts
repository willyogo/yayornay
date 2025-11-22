import { useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';
import { mainnet, base } from 'viem/chains';

/**
 * Hook to resolve ENS/Basename for a given address
 * Tries Ethereum mainnet ENS first, then Base Basename
 */
export function useEnsProfile(address?: string) {
  // Try mainnet ENS first
  const { data: mainnetEnsName, isLoading: isLoadingMainnet } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id,
    query: {
      enabled: !!address && address.startsWith('0x'),
    },
  });

  // Try Base Basename as fallback
  const { data: baseEnsName, isLoading: isLoadingBase } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: base.id,
    query: {
      enabled: !!address && address.startsWith('0x') && !mainnetEnsName,
    },
  });

  const ensName = mainnetEnsName || baseEnsName;

  const { data: ensAvatar, isLoading: isLoadingAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: mainnetEnsName ? mainnet.id : base.id,
    query: {
      enabled: !!ensName,
    },
  });

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    displayName: ensName || (address ? formatAddress(address) : ''),
    ensName: ensName || null,
    avatar: ensAvatar || null,
    isLoading: isLoadingMainnet || isLoadingBase || isLoadingAvatar,
    address,
  };
}
