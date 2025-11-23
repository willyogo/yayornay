// @ts-nocheck
// Supabase Edge Function to create a server wallet for a user
// This function securely creates a CDP account server-side using CdpClient
// Note: This file runs in Deno, not Node.js, so TypeScript checking is disabled

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import CDP SDK - using npm: specifier for Deno compatibility
import { CdpClient } from 'npm:@coinbase/cdp-sdk@latest'
import { getCdpNetwork } from '../_shared/constants.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const cdpApiKeyId = Deno.env.get('VITE_CDP_API_KEY') || Deno.env.get('CDP_API_KEY_ID')
    const cdpApiKeySecret = Deno.env.get('VITE_CDP_API_SECRET') || Deno.env.get('CDP_API_KEY_SECRET')
    const cdpWalletSecret = Deno.env.get('CDP_WALLET_SECRET') || Deno.env.get('VITE_CDP_WALLET_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY')

    if (!cdpApiKeyId || !cdpApiKeySecret || !cdpWalletSecret) {
      const missing = []
      if (!cdpApiKeyId) missing.push('VITE_CDP_API_KEY or CDP_API_KEY_ID')
      if (!cdpApiKeySecret) missing.push('VITE_CDP_API_SECRET or CDP_API_KEY_SECRET')
      if (!cdpWalletSecret) missing.push('CDP_WALLET_SECRET or VITE_CDP_WALLET_SECRET')
      throw new Error(`Missing CDP API credentials: ${missing.join(', ')}`)
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      const missing = []
      if (!supabaseUrl) missing.push('VITE_SUPABASE_URL or SUPABASE_URL')
      if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY')
      throw new Error(`Missing Supabase credentials: ${missing.join(', ')}`)
    }

    // Initialize CDP SDK - CdpClient requires apiKeyId, apiKeySecret, and walletSecret
    const cdp = new CdpClient({
      apiKeyId: cdpApiKeyId,
      apiKeySecret: cdpApiKeySecret,
      walletSecret: cdpWalletSecret,
    })

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get request body
    const { userAddress } = await req.json()

    if (!userAddress) {
      return new Response(
        JSON.stringify({ error: 'userAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()

    // Check if user already has a server wallet
    const { data: existingWallet, error: fetchError } = await supabase
      .from('server_wallets')
      .select('*')
      .eq('user_address', normalizedAddress)
      .single()

    if (existingWallet && !fetchError) {
      return new Response(
        JSON.stringify({
          serverWalletAddress: existingWallet.server_wallet_address,
          walletId: existingWallet.server_wallet_id,
          message: 'Wallet already exists',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get network from constants (respects CDP_NETWORK_ID env var, defaults to mainnet)
    const networkId = getCdpNetwork()
    console.log('[create-wallet] Detected network:', networkId, {
      envVar: Deno.env.get('CDP_NETWORK_ID'),
      supabaseUrl: Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL'),
      environment: Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV'),
    })
    
    // Create Smart Account for gasless transactions via CDP Paymaster
    // Smart Accounts on Base automatically use CDP Paymaster for gas sponsorship
    console.log('[create-wallet] Creating Smart Account with owner for user:', normalizedAddress)
    
    // Step 1: Create an EOA owner
    const accountName = `yaynay-owner-${normalizedAddress.slice(2, 10)}`
    const owner = await cdp.evm.getOrCreateAccount({ name: accountName })
    console.log('[create-wallet] Created owner EOA:', owner.address)
    
    // Step 2: Create Smart Account owned by the EOA
    const smartAccountName = `yaynay-smart-${normalizedAddress.slice(2, 10)}`
    const smartAccount = await cdp.evm.getOrCreateSmartAccount({
      name: smartAccountName,
      owner,
    })
    
    const serverWalletAddress = smartAccount.address
    const walletId = smartAccountName

    // Store wallet metadata in database
    // Note: With CdpClient, we don't need to store wallet_data since CDP manages accounts server-side
    // We only need to store the address for lookup
    const { data: insertedWallet, error: insertError } = await supabase
      .from('server_wallets')
      .insert({
        user_address: normalizedAddress,
        server_wallet_id: walletId,
        server_wallet_address: serverWalletAddress,
        wallet_data: {}, // Empty object - CDP manages accounts, no need to store wallet data
        network_id: networkId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting wallet:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store wallet', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        serverWalletAddress: serverWalletAddress,
        walletId: walletId,
        message: 'Wallet created successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating wallet:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create wallet', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
