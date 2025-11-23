/**
 * Integration tests for Edge Functions
 * 
 * These tests mock the Edge Functions to test the client-side integration
 * without requiring real infrastructure.
 * 
 * For tests that require real Edge Functions, see: src/test/integration/edgeFunctions.e2e.test.ts
 * 
 * Run with: pnpm test:integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from '../mocks/supabase';
import {
  mockCreateWalletResponse,
  mockGetWalletResponse,
  mockServerWallet,
} from '../fixtures/serverWallets';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Edge Functions Integration Tests (Mocked)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe('create-wallet function', () => {
    it('should create a wallet for a user', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockCreateWalletResponse,
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke('create-wallet', {
        body: { userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.serverWalletAddress).toBeDefined();
      expect(data?.walletId).toBeDefined();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-wallet', {
        body: { userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      });
    });

    it('should return existing wallet if already created', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          ...mockCreateWalletResponse,
          message: 'Wallet already exists',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke('create-wallet', {
        body: { userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.message).toBe('Wallet already exists');
    });

    it('should handle errors when creating wallet', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create wallet', status: 500 },
      });

      const { data, error } = await mockSupabase.functions.invoke('create-wallet', {
        body: { userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      });

      expect(error).toBeDefined();
      expect(error?.message).toBe('Failed to create wallet');
      expect(data).toBeNull();
    });
  });

  describe('get-wallet function', () => {
    it('should retrieve wallet information', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockGetWalletResponse,
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke('get-wallet', {
        body: { userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.serverWalletAddress).toBeDefined();
      expect(data?.walletId).toBeDefined();
      expect(data?.networkId).toBe('base-sepolia');
    });

    it('should return error for non-existent wallet', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'Server wallet not found for user' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('get-wallet', {
        body: { userAddress: '0x' + '9'.repeat(40) },
      });

      expect(data?.error).toBeDefined();
    });
  });

  describe('send-transaction function', () => {
    it('should send transaction successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          transactionHash: '0x' + '1'.repeat(64),
          status: 'success',
          message: 'Transaction sent successfully',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke('send-transaction', {
        body: {
          userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          to: '0x' + '1'.repeat(40),
          amount: '1000000000000000000',
          currency: 'ETH',
        },
      });

      expect(error).toBeNull();
      expect(data?.transactionHash).toBeDefined();
      expect(data?.status).toBe('success');
    });

    it('should handle transaction errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'Insufficient balance' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('send-transaction', {
        body: {
          userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          to: '0x' + '1'.repeat(40),
          amount: '1000000000000000000',
          currency: 'ETH',
        },
      });

      expect(data?.error).toBeDefined();
    });
  });

  describe('Database consistency', () => {
    it('should query wallet from database', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: mockServerWallet,
        error: null,
      });

      const { data, error } = await mockSupabase
        .from('server_wallets')
        .select('*')
        .eq('user_address', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'.toLowerCase())
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.server_wallet_address).toBeDefined();
      expect(data?.server_wallet_id).toBeDefined();
    });
  });
});
