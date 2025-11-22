// Builder DAO testnet contracts on Base Sepolia
export const CONTRACTS = {
  NFT: '0x626FbB71Ca4FE65F94e73AB842148505ae1a0B26',
  AUCTION_HOUSE: '0xe9609Fb710bDC6f88Aa5992014a156aeb31A6896',
  GOVERNOR: '0x9F530c7bCdb859bB1DcA3cD4EAE644f973A5f505',
  TREASURY: '0x3ed26c1d23Fd4Ea3B5e2077B60B4F1EC80Aba94f',
  METADATA: '0x82ACd8e6ea567d99B63fcFc21ec824b5D05C9744',
} as const;

// Nouns Builder Auction House ABI (minimal functions needed)
export const AUCTION_HOUSE_ABI = [
  {
    inputs: [],
    name: 'auction',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'nounId', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'address', name: 'bidder', type: 'address' },
          { internalType: 'bool', name: 'settled', type: 'bool' },
        ],
        internalType: 'struct IAuctionHouse.Auction',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reservePrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'duration',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minBidIncrementPercentage',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    type: 'function',
    stateMutability: 'payable',
    name: 'createBid',
    inputs: [{ name: 'nounId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'settleAuction',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'settleCurrentAndCreateNewAuction',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getSettlements',
    inputs: [
      { name: 'startId', type: 'uint256' },
      { name: 'endId', type: 'uint256' },
      { name: 'skipEmptyValues', type: 'bool' },
    ],
    outputs: [
      {
        name: 'settlements',
        type: 'tuple[]',
        components: [
          { name: 'blockTimestamp', type: 'uint32' },
          { name: 'amount', type: 'uint256' },
          { name: 'winner', type: 'address' },
          { name: 'nounId', type: 'uint256' },
          { name: 'clientId', type: 'uint32' },
        ],
      },
    ],
  },
] as const;

export interface Auction {
  nounId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  bidder: `0x${string}`;
  settled: boolean;
}

// Re-export GovernorABI from the SDK
export { GovernorABI } from '@buildersdk/sdk';

