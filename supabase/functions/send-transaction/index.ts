// @ts-nocheck
// Supabase Edge Function to send transactions using a user's server wallet
// This function securely signs and sends transactions server-side
// Note: This file runs in Deno, not Node.js, so TypeScript checking is disabled

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
      throw new Error('Missing CDP API credentials')
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials')
    }

    // Initialize CDP SDK
    Coinbase.configure({
      apiKeyName: cdpApiKeyName,
      privateKey: cdpApiKeyPrivateKey,
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

    // Get wallet from database
    const { data: walletRecord, error: fetchError } = await supabase
      .from('server_wallets')
      .select('*')
      .eq('user_address', normalizedAddress)
      .single()

    if (fetchError || !walletRecord) {
      return new Response(
        JSON.stringify({ error: 'Server wallet not found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Restore wallet from stored data
    // Note: In production, decrypt walletData before importing!
    const wallet = await Wallet.import(walletRecord.wallet_data)

    // Send transaction
    const transfer = await wallet.send({
      to,
      amount: amount.toString(),
      currency: currency || 'ETH',
      networkId: walletRecord.network_id || 'base-sepolia',
      data: data || undefined,
    })

    return new Response(
      JSON.stringify({
        transactionHash: transfer.hash,
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

