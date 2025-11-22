#!/usr/bin/env tsx
/**
 * Simple test script to create a wallet
 * 
 * Usage:
 *   npx tsx scripts/test-create-wallet.ts
 * 
 * Prerequisites:
 *   - Supabase running: supabase start
 *   - Edge Functions serving: supabase functions serve
 *   - .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!anonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not set in .env');
  console.log('💡 Run: supabase start (then copy the anon key)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

// Use any test address
const testAddress = process.argv[2] || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

async function testCreateWallet() {
  console.log(`\n🧪 Testing wallet creation for: ${testAddress}\n`);

  try {
    const { data, error } = await supabase.functions.invoke('create-wallet', {
      body: { userAddress: testAddress },
    });

    if (error) {
      console.error('❌ Error:', error.message);
      if (error.message.includes('500')) {
        console.log('\n💡 This might mean:');
        console.log('   - Edge Functions not running (run: supabase functions serve)');
        console.log('   - CDP credentials missing (check .env for VITE_CDP_API_KEY)');
        console.log('   - Database migration not applied (run: supabase db push)');
      }
      process.exit(1);
    }

    if (data?.error) {
      console.error('❌ Function error:', data.error);
      console.log('Details:', data.details || 'No details');
      process.exit(1);
    }

    console.log('✅ SUCCESS! Wallet created:');
    console.log(`   Address: ${data.serverWalletAddress}`);
    console.log(`   Wallet ID: ${data.walletId}`);
    console.log(`   Message: ${data.message || 'Wallet created successfully'}`);
    console.log('\n🎉 Wallet generation works!');
  } catch (err) {
    console.error('❌ Exception:', err);
    process.exit(1);
  }
}

testCreateWallet();

