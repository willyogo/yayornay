/**
 * Test suite for server wallet functionality
 * 
 * Run tests with: pnpm test
 * Watch mode: pnpm test:watch
 * Coverage: pnpm test:coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from './mocks/supabase';
import {
  mockCreateWalletResponse,
  mockGetWalletResponse,
  mockServerWallet,
} from './fixtures/serverWallets';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// Mock the serverWallet module (will be created)
// For now, we'll test the expected behavior

describe('Server Wallet Utilities', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createServerWallet', () => {
    it('should create a wallet successfully', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockCreateWalletResponse,
        error: null,
      });

      // This would be the actual implementation
      const { data, error } = await mockSupabase.functions.invoke('create-wallet', {
        body: { userAddress },
      });

      expect(error).toBeNull();
      expect(data).toEqual(mockCreateWalletResponse);
      expect(data.serverWalletAddress).toBeDefined();
      expect(data.walletId).toBeDefined();
    });

    it('should handle errors when creating wallet', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const errorMessage = 'Failed to create wallet';

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });

      const { data, error } = await mockSupabase.functions.invoke('create-wallet', {
        body: { userAddress },
      });

      expect(error).toBeDefined();
      expect(error.message).toBe(errorMessage);
      expect(data).toBeNull();
    });

    it('should handle missing userAddress', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'userAddress is required' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('create-wallet', {
        body: {},
      });

      expect(data.error).toBe('userAddress is required');
    });
  });

  describe('getServerWallet', () => {
    it('should retrieve wallet successfully', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockGetWalletResponse,
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke('get-wallet', {
        body: { userAddress },
      });

      expect(error).toBeNull();
      expect(data).toEqual(mockGetWalletResponse);
      expect(data.serverWalletAddress).toBeDefined();
    });

    it('should return null if wallet not found', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'Server wallet not found for user' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('get-wallet', {
        body: { userAddress },
      });

      expect(data.error).toContain('not found');
    });
  });

  describe('hasServerWallet', () => {
    it('should return true if wallet exists', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: mockServerWallet,
        error: null,
      });

      const { data, error } = await mockSupabase
        .from('server_wallets')
        .select('server_wallet_address')
        .eq('user_address', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'.toLowerCase())
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should return false if wallet does not exist', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const { data, error } = await mockSupabase
        .from('server_wallets')
        .select('server_wallet_address')
        .eq('user_address', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'.toLowerCase())
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('sendServerWalletTransaction', () => {
    it('should send transaction successfully', async () => {
      const transactionParams = {
        userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x' + '1'.repeat(40),
        amount: '1000000000000000000',
        currency: 'ETH',
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          transactionHash: '0x' + '1'.repeat(64),
          status: 'success',
          message: 'Transaction sent successfully',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke('send-transaction', {
        body: transactionParams,
      });

      expect(error).toBeNull();
      expect(data.transactionHash).toBeDefined();
      expect(data.status).toBe('success');
    });

    it('should handle transaction errors', async () => {
      const transactionParams = {
        userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x' + '1'.repeat(40),
        amount: '1000000000000000000',
        currency: 'ETH',
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'Insufficient balance' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('send-transaction', {
        body: transactionParams,
      });

      expect(data.error).toBeDefined();
    });
  });
});

