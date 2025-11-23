// @ts-nocheck
// Supabase Edge Function to send transactions using a user's server wallet
// This function securely signs and sends transactions server-side using CdpClient
// Note: This file runs in Deno, not Node.js, so TypeScript checking is disabled

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CdpClient } from 'npm:@coinbase/cdp-sdk@latest'
import { getCdpNetwork, CDP_NETWORKS } from '../_shared/constants.ts'

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
      throw new Error('Missing Supabase credentials')
    }

    // Initialize CDP SDK
    const cdp = new CdpClient({
      apiKeyId: cdpApiKeyId,
      apiKeySecret: cdpApiKeySecret,
      walletSecret: cdpWalletSecret,
    })

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get request body
    const { userAddress, to, amount, currency, data } = await req.json()

    if (!userAddress || !to || !amount) {
      return new Response(
        JSON.stringify({ error: 'userAddress, to, and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()

    // Get wallet from database - we only need the account address
    const { data: walletRecord, error: fetchError } = await supabase
      .from('server_wallets')
      .select('server_wallet_address, network_id')
      .eq('user_address', normalizedAddress)
      .single()

    if (fetchError || !walletRecord) {
      return new Response(
        JSON.stringify({ error: 'Server wallet not found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use network from wallet record, or fall back to constants-based detection
    const networkId = walletRecord.network_id || getCdpNetwork()
    
    // Convert amount to wei if currency is ETH (amount should be in wei already, but ensure it's a string)
    // For other currencies, amount should be in the smallest unit
    const amountValue = typeof amount === 'string' ? amount : amount.toString()
    
    // Build transaction object
    const transaction: any = {
      to,
      value: amountValue,
    }
    
    // Add data field if provided (for contract calls)
    if (data) {
      transaction.data = data
    }

    // Send transaction using CdpClient
    // CDP manages the account server-side, we just need the address
    const txResult = await cdp.evm.sendTransaction({
      address: walletRecord.server_wallet_address,
      network: networkId,
      transaction,
    })

    return new Response(
      JSON.stringify({
        transactionHash: txResult.transactionHash,
        status: 'success',
        message: 'Transaction sent successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending transaction:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send transaction', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

