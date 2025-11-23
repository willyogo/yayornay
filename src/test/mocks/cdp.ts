// Mock CDP SDK for testing
import { vi } from 'vitest';

export const mockEvmAccount = {
  address: '0x' + '0'.repeat(40),
  id: 'mock-account-id',
};

export const mockCreateAccount = vi.fn(() => Promise.resolve(mockEvmAccount));

export const mockSendTransaction = vi.fn(() => 
  Promise.resolve({
    transactionHash: '0x' + '1'.repeat(64),
  })
);

export const mockCdpClient = {
  evm: {
    createAccount: mockCreateAccount,
    sendTransaction: mockSendTransaction,
  },
};

export const mockCdpClientConstructor = vi.fn(() => mockCdpClient);

// For backward compatibility with old tests
export const mockCoinbaseSDK = {
  configure: vi.fn(),
  configureFromJson: vi.fn(),
  networks: {
    BaseSepolia: 'base-sepolia',
    BaseMainnet: 'base-mainnet',
  },
  Wallet: {
    create: mockCreateAccount, // Map to new API for compatibility
    import: vi.fn(() => Promise.resolve(mockEvmAccount)),
  },
};

