#!/usr/bin/env tsx
/**
 * Test script for server wallets Edge Functions
 * 
 * Usage:
 *   npx tsx scripts/test-server-wallets.ts
 * 
 * Prerequisites:
 *   - Supabase running locally: supabase start
 *   - Edge Functions serving: supabase functions serve
 *   - Environment variables set in .env
 */

import { createClient } from '@supabase/supabase-js';

// Get local Supabase URL and key
// These should match your local Supabase instance
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!anonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not set');
  console.log('💡 Get it from: supabase start');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

// Test address (you can change this)
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

async function testCreateWallet() {
  console.log('🧪 Test 1: Creating wallet...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-wallet', {
      body: { userAddress: TEST_ADDRESS },
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }

    if (data?.error) {
      console.error('❌ Function error:', data.error);
      return null;
    }

    console.log('✅ Wallet created:', {
      address: data.serverWalletAddress,
      walletId: data.walletId,
    });
    return data;
  } catch (err) {
    console.error('❌ Exception:', err);
    return null;
  }
}

async function testGetWallet() {
  console.log('\n🧪 Test 2: Getting wallet...');
  
  try {
    const { data, error } = await supabase.functions.invoke('get-wallet', {
      body: { userAddress: TEST_ADDRESS },
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }

    if (data?.error) {
      console.error('❌ Function error:', data.error);
      return null;
    }

    console.log('✅ Wallet retrieved:', {
      address: data.serverWalletAddress,
      walletId: data.walletId,
      networkId: data.networkId,
    });
    return data;
  } catch (err) {
    console.error('❌ Exception:', err);
    return null;
  }
}

async function testDatabaseQuery() {
  console.log('\n🧪 Test 3: Querying database...');
  
  try {
    const { data, error } = await supabase
      .from('server_wallets')
      .select('server_wallet_address, server_wallet_id, network_id, created_at')
      .eq('user_address', TEST_ADDRESS.toLowerCase())
      .single();

    if (error) {
      console.error('❌ Database error:', error.message);
      return null;
    }

    console.log('✅ Database record found:', {
      address: data.server_wallet_address,
      walletId: data.server_wallet_id,
      networkId: data.network_id,
      createdAt: data.created_at,
    });
    return data;
  } catch (err) {
    console.error('❌ Exception:', err);
    return null;
  }
}

async function testDuplicateCreation() {
  console.log('\n🧪 Test 4: Testing duplicate creation (should return existing)...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-wallet', {
      body: { userAddress: TEST_ADDRESS },
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }

    if (data?.message?.includes('already exists')) {
      console.log('✅ Correctly handled duplicate (returned existing wallet)');
      return true;
    }

    console.log('⚠️  Unexpected response:', data);
    return false;
  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Server Wallets Tests\n');
  console.log(`📍 Test address: ${TEST_ADDRESS}\n`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

  // Test 1: Create wallet
  const createResult = await testCreateWallet();
  if (!createResult) {
    console.log('\n❌ Create wallet test failed. Stopping tests.');
    return;
  }

  // Test 2: Get wallet
  const getResult = await testGetWallet();
  if (!getResult) {
    console.log('\n❌ Get wallet test failed.');
  }

  // Test 3: Database query
  const dbResult = await testDatabaseQuery();
  if (!dbResult) {
    console.log('\n❌ Database query test failed.');
  }

  // Test 4: Duplicate creation
  await testDuplicateCreation();

  console.log('\n✨ Tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   - Fund the server wallet with test ETH');
  console.log('   - Test send-transaction function');
  console.log('   - Test in browser with useServerWallet hook');
}

// Run tests
runAllTests().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});

