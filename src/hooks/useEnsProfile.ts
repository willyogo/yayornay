import { useQuery } from '@tanstack/react-query';

interface ENSDataResponse {
  address: string;
  ens?: string;
  ens_primary?: string;
  avatar?: string;
  avatar_url?: string;
}

/**
 * Hook to resolve ENS for a given address using ensdata.net API
 * Returns primary ENS name and avatar from Ethereum mainnet
 */
export function useEnsProfile(address?: string, shortStart = 6) {
  const { data, isLoading } = useQuery<ENSDataResponse>({
    queryKey: ['ens', address],
    queryFn: async () => {
      if (!address) throw new Error('No address provided');
      
      const url = `https://ensdata.net/${address}`;
      console.log('[useEnsProfile] Fetching:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('[useEnsProfile] Failed to fetch:', response.status, response.statusText);
        throw new Error('Failed to fetch ENS data');
      }
      
      const json = await response.json();
      console.log('[useEnsProfile] Response for', address, ':', json);
      return json;
    },
    enabled: !!address && address.startsWith('0x'),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: false,
  });

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 10) return addr;
    return `${addr.slice(0, shortStart)}...${addr.slice(-4)}`;
  };

  const ensName = data?.ens_primary || data?.ens;

  return {
    displayName: ensName || (address ? formatAddress(address) : ''),
    ensName: ensName || null,
    avatar: data?.avatar_url || data?.avatar || null,
    isLoading,
    address,
  };
}
