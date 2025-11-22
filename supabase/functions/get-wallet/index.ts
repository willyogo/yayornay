// @ts-nocheck
// Supabase Edge Function to get a user's server wallet address
// This is a read-only function that doesn't expose sensitive wallet data
// Note: This file runs in Deno, not Node.js, so TypeScript checking is disabled

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials')
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get user address from query params or body
    const url = new URL(req.url)
    const userAddress = url.searchParams.get('userAddress') || (await req.json()).userAddress

    if (!userAddress) {
      return new Response(
        JSON.stringify({ error: 'userAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()

    // Get wallet from database (only return public info, not wallet_data)
    const { data: walletRecord, error: fetchError } = await supabase
      .from('server_wallets')
      .select('server_wallet_address, server_wallet_id, network_id, created_at')
      .eq('user_address', normalizedAddress)
      .single()

    if (fetchError || !walletRecord) {
      return new Response(
        JSON.stringify({ error: 'Server wallet not found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        serverWalletAddress: walletRecord.server_wallet_address,
        walletId: walletRecord.server_wallet_id,
        networkId: walletRecord.network_id,
        createdAt: walletRecord.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting wallet:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get wallet', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

