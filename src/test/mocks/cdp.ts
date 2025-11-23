// Mock CDP SDK for testing
import { vi } from 'vitest';

export const mockWallet = {
  getId: vi.fn(() => 'mock-wallet-id'),
  getDefaultAddress: vi.fn(() => ({
    address: '0x' + '0'.repeat(40),
  })),
  serialize: vi.fn(() => ({
    id: 'mock-wallet-id',
    networkId: 'base-sepolia',
    data: 'mock-serialized-data',
  })),
  send: vi.fn(() => ({
    hash: '0x' + '1'.repeat(64),
    status: 'success',
  })),
};

export const mockWalletCreate = vi.fn(() => Promise.resolve(mockWallet));
export const mockWalletImport = vi.fn(() => Promise.resolve(mockWallet));

export const mockCoinbaseSDK = {
  configure: vi.fn(),
  configureFromJson: vi.fn(),
  networks: {
    BaseSepolia: 'base-sepolia',
    BaseMainnet: 'base-mainnet',
  },
  Wallet: {
    create: mockWalletCreate,
    import: mockWalletImport,
  },
};

