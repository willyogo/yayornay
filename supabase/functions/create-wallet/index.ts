// @ts-nocheck
// Supabase Edge Function to create a server wallet for a user
// This function securely creates a CDP wallet server-side
// Note: This file runs in Deno, not Node.js, so TypeScript checking is disabled

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import CDP SDK - using npm: specifier for Deno compatibility
import { Coinbase, Wallet } from 'npm:@coinbase/coinbase-sdk@latest'

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
    const cdpApiKeyName = Deno.env.get('VITE_CDP_API_KEY')
    const cdpApiKeyPrivateKey = Deno.env.get('VITE_CDP_API_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY')


    if (!cdpApiKeyName || !cdpApiKeyPrivateKey) {
      const missing = []
      if (!cdpApiKeyName) missing.push('VITE_CDP_API_KEY')
      if (!cdpApiKeyPrivateKey) missing.push('VITE_CDP_API_SECRET')
      throw new Error(`Missing CDP API credentials: ${missing.join(', ')}`)
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      const missing = []
      if (!supabaseUrl) missing.push('VITE_SUPABASE_URL or SUPABASE_URL')
      if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY')
      throw new Error(`Missing Supabase credentials: ${missing.join(', ')}`)
    }

    // Initialize CDP SDK
    Coinbase.configure({
      apiKeyName: cdpApiKeyName,
      privateKey: cdpApiKeyPrivateKey,
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

    // Create new wallet (defaults to Base Sepolia testnet)
    const wallet = await Wallet.create({
      networkId: 'base-sepolia',
      // For production, use Coinbase-Managed (2-of-2 MPC):
      // walletConfig: { type: 'COINBASE_MANAGED' }
    })

    // Get the default address
    const address = await wallet.getDefaultAddress()

    // Extract address string - CDP SDK returns address object with id property
    let serverWalletAddress: string
    if (typeof address === 'string') {
      serverWalletAddress = address
    } else if (address?.id) {
      // CDP SDK returns address object with id property
      serverWalletAddress = address.id
    } else if (address?.address) {
      serverWalletAddress = address.address
    } else if (address?.key?.address) {
      serverWalletAddress = address.key.address
    } else if (address?.model?.address_id) {
      serverWalletAddress = address.model.address_id
    } else {
      throw new Error(`Unable to extract address from: ${JSON.stringify(address)}`)
    }

    // Get wallet ID - CDP SDK returns wallet with id property or from address model
    let walletId: string
    if (typeof wallet.getId === 'function') {
      walletId = wallet.getId()
    } else if (wallet.id) {
      walletId = wallet.id
    } else if (address?.model?.wallet_id) {
      // Wallet ID is in the address model
      walletId = address.model.wallet_id
    } else if (wallet.walletId) {
      walletId = wallet.walletId
    } else {
      // Use address as identifier if wallet ID not available
      walletId = serverWalletAddress
      console.warn('Could not find wallet ID, using address as ID')
    }

    // Serialize wallet data for storage
    // CDP SDK may not have serialize() - store wallet object as JSON or minimal data
    let walletData: any
    try {
      if (typeof wallet.serialize === 'function') {
        walletData = wallet.serialize()
      } else if (typeof wallet.toJSON === 'function') {
        walletData = wallet.toJSON()
      } else if (typeof wallet.export === 'function') {
        walletData = await wallet.export()
      } else {
        // Store wallet object directly (CDP manages it server-side)
        // We only need to store enough info to identify it later
        walletData = {
          id: walletId,
          address: serverWalletAddress,
          networkId: 'base-sepolia',
        }
      }
    } catch (err) {
      console.error('Error serializing wallet:', err)
      // Fallback: store minimal data
      walletData = {
        id: walletId,
        address: address.address,
        networkId: 'base-sepolia',
      }
    }

    // Store wallet in database
    // Note: In production, encrypt walletData before storing!
    const { data: insertedWallet, error: insertError } = await supabase
      .from('server_wallets')
      .insert({
        user_address: normalizedAddress,
        server_wallet_id: walletId,
        server_wallet_address: serverWalletAddress,
        wallet_data: walletData, // ⚠️ In production, encrypt this!
        network_id: 'base-sepolia',
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
