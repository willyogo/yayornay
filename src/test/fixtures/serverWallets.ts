// Test fixtures for server wallets

export const mockServerWallet = {
  id: 'test-uuid',
  user_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  server_wallet_id: 'cdp-wallet-123',
  server_wallet_address: '0x' + '0'.repeat(40),
  wallet_data: {}, // Empty object - CDP manages accounts server-side
  network_id: 'base-sepolia',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockCreateWalletResponse = {
  serverWalletAddress: '0x' + '0'.repeat(40),
  walletId: 'cdp-wallet-123',
  message: 'Wallet created successfully',
};

export const mockGetWalletResponse = {
  serverWalletAddress: '0x' + '0'.repeat(40),
  walletId: 'cdp-wallet-123',
  networkId: 'base-sepolia',
  createdAt: '2024-01-01T00:00:00Z',
};

export const mockSendTransactionResponse = {
  transactionHash: '0x' + '1'.repeat(64),
  status: 'success',
  message: 'Transaction sent successfully',
};

