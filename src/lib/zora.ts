import { ZDK, ZDKChain, ZDKNetwork } from '@zoralabs/zdk';

const zdk = new ZDK({
  endpoint: 'https://api.zora.co/graphql',
  networks: [
    {
      chain: ZDKChain.BaseMainnet,
      network: ZDKNetwork.Base,
    },
  ],
});

export interface CreatorProfile {
  address: string;
  username?: string;
  avatar?: string;
  tokens: CreatorToken[];
}

export interface CreatorToken {
  id: string;
  name: string;
  description?: string;
  image?: string;
  tokenId: string;
  collectionAddress: string;
}

export async function getCreatorProfile(address: string): Promise<CreatorProfile | null> {
  try {
    const response = await zdk.tokens({
      where: {
        ownerAddresses: [address],
      },
      pagination: { limit: 20 },
    });

    const tokens: CreatorToken[] = (response.tokens?.nodes || []).map((token: any) => ({
      id: token.token?.tokenId || '',
      name: token.token?.name || 'Untitled',
      description: token.token?.description || '',
      image: token.token?.image?.url || '',
      tokenId: token.token?.tokenId || '',
      collectionAddress: token.token?.collectionAddress || '',
    }));

    return {
      address,
      tokens,
    };
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    return null;
  }
}

export async function getCreatorTokensByUsername(username: string): Promise<CreatorToken[]> {
  try {
    const response = await zdk.tokens({
      where: {
        collectionAddresses: [],
      },
      pagination: { limit: 20 },
    });

    return (response.tokens?.nodes || []).map((token: any) => ({
      id: token.token?.tokenId || '',
      name: token.token?.name || 'Untitled',
      description: token.token?.description || '',
      image: token.token?.image?.url || '',
      tokenId: token.token?.tokenId || '',
      collectionAddress: token.token?.collectionAddress || '',
    }));
  } catch (error) {
    console.error('Error fetching creator tokens:', error);
    return [];
  }
}
