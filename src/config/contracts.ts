// Builder DAO contracts on Base Mainnet
export const CONTRACTS = {
  NFT: '0x3740fea2a46ca4414b4afde16264389642e6596a',
  AUCTION_HOUSE: '0x14227ed5dd596e3a63773933ba68014ed3cfb7e5',
  GOVERNOR: '0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e',
  TREASURY: '0x72b052a9a830001ce202ad907e6eedd0b86c4a88',
  METADATA: '0x47887fc1e456531765ecad1ae20b762f59ae6cf9',
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

