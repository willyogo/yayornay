/**
 * End-to-end integration tests for Edge Functions
 * 
 * ⚠️ These tests require REAL infrastructure:
 * - Supabase running locally (supabase start)
 * - Edge Functions serving (supabase functions serve)
 * - Database migration applied (supabase db push)
 * - CDP API credentials configured
 * 
 * These tests verify the actual Edge Functions work with real services.
 * Skip these in CI unless you have test infrastructure set up.
 * 
 * Run with: pnpm test:e2e:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

// Skip these tests if infrastructure is not available
const shouldSkip = !SUPABASE_ANON_KEY || process.env.SKIP_E2E_TESTS === 'true';

describe.skipIf(shouldSkip)('Edge Functions E2E Tests (Real Infrastructure)', () => {
  let supabase: ReturnType<typeof createClient>;
  let createdWalletId: string | null = null;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  afterAll(async () => {
    // Cleanup: Delete test wallet if created
    if (createdWalletId) {
      await supabase
        .from('server_wallets')
        .delete()
        .eq('user_address', TEST_ADDRESS.toLowerCase());
    }
  });

  describe('create-wallet function', () => {
    it('should create a wallet for a user', async () => {
      const { data, error } = await supabase.functions.invoke('create-wallet', {
        body: { userAddress: TEST_ADDRESS },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.serverWalletAddress).toBeDefined();
      expect(data?.walletId).toBeDefined();

      if (data?.walletId) {
        createdWalletId = data.walletId;
      }
    }, 30000); // 30 second timeout for CDP API call

    it('should return existing wallet if already created', async () => {
      const { data, error } = await supabase.functions.invoke('create-wallet', {
        body: { userAddress: TEST_ADDRESS },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // Should return existing wallet, not create new one
      expect(data?.message).toBeDefined();
    }, 30000);
  });

  describe('get-wallet function', () => {
    it('should retrieve wallet information', async () => {
      const { data, error } = await supabase.functions.invoke('get-wallet', {
        body: { userAddress: TEST_ADDRESS },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.serverWalletAddress).toBeDefined();
      expect(data?.walletId).toBeDefined();
      expect(data?.networkId).toBe('base-sepolia');
    });

    it('should return error for non-existent wallet', async () => {
      const nonExistentAddress = '0x' + '9'.repeat(40);

      const { data, error } = await supabase.functions.invoke('get-wallet', {
        body: { userAddress: nonExistentAddress },
      });

      // Should return error or null data
      expect(data?.error || error).toBeDefined();
    });
  });

  describe('send-transaction function', () => {
    it('should fail if wallet has no balance', async () => {
      // This test expects failure due to insufficient balance
      const { data, error } = await supabase.functions.invoke('send-transaction', {
        body: {
          userAddress: TEST_ADDRESS,
          to: '0x' + '1'.repeat(40),
          amount: '1000000000000000000', // 1 ETH
          currency: 'ETH',
        },
      });

      // Should fail with insufficient balance or wallet not found
      expect(data?.error || error).toBeDefined();
    }, 30000);
  });

  describe('Database consistency', () => {
    it('should have wallet record in database after creation', async () => {
      const { data, error } = await supabase
        .from('server_wallets')
        .select('*')
        .eq('user_address', TEST_ADDRESS.toLowerCase())
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.server_wallet_address).toBeDefined();
      expect(data?.server_wallet_id).toBeDefined();
      expect(data?.user_address).toBe(TEST_ADDRESS.toLowerCase());
    });
  });
});

