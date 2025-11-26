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
    const paymasterUrl = Deno.env.get('VITE_PAYMASTER_URL') || Deno.env.get('PAYMASTER_URL')

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

    console.log('[send-transaction] Paymaster configured:', !!paymasterUrl)

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

    console.log('[send-transaction] Request received:', {
      userAddress,
      to,
      amount,
      currency,
      hasData: !!data,
      dataLength: data?.length,
    })

    if (!userAddress || !to || amount === undefined) {
      const error = { error: 'userAddress, to, and amount are required' }
      console.error('[send-transaction] Invalid request:', error)
      return new Response(
        JSON.stringify(error),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()

    console.log('[send-transaction] Looking up server wallet for:', normalizedAddress)

    // Get wallet from database - we only need the account address
    const { data: walletRecord, error: fetchError } = await supabase
      .from('server_wallets')
      .select('server_wallet_address, network_id')
      .eq('user_address', normalizedAddress)
      .single()

    console.log('[send-transaction] Wallet lookup result:', {
      found: !!walletRecord,
      error: fetchError,
      walletAddress: walletRecord?.server_wallet_address,
    })

    if (fetchError || !walletRecord) {
      const error = { error: 'Server wallet not found for user', details: fetchError }
      console.error('[send-transaction] Wallet not found:', error)
      return new Response(
        JSON.stringify(error),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[send-transaction] 🔑 SERVER WALLET ADDRESS:', walletRecord.server_wallet_address)
    console.log('[send-transaction] ⚠️  This wallet needs ETH for gas. Fund it at:', `https://basescan.org/address/${walletRecord.server_wallet_address}`)

    // Use network from wallet record, or fall back to constants-based detection
    const networkId = walletRecord.network_id || getCdpNetwork()
    console.log('[send-transaction] Using network:', networkId, {
      fromWalletRecord: walletRecord.network_id,
      detected: getCdpNetwork(),
    })
    
    // Convert amount - CDP SDK accepts number, string, or bigint
    // For contract calls with value=0, we can pass 0 directly
    const amountValue = amount === "0" || amount === 0 ? 0 : 
                       (typeof amount === 'string' ? amount : amount.toString())
    
    // Build transaction object for CDP SDK
    // CDP SDK uses standard Ethereum transaction format
    const transaction: any = {
      to,
      value: amountValue,
    }
    
    // Add data field for contract calls (standard Ethereum field)
    if (data) {
      transaction.data = data
    }

    console.log('[send-transaction] Sending transaction:', {
      address: walletRecord.server_wallet_address,
      network: networkId,
      transaction,
      valueType: typeof amountValue,
    })

    // Use Smart Account sendUserOperation for automatic Paymaster support
    // Smart Accounts on Base automatically use CDP Paymaster
    console.log('[send-transaction] Checking wallet type:', {
      hasWalletId: !!walletRecord.server_wallet_id,
      walletId: walletRecord.server_wallet_id,
      address: walletRecord.server_wallet_address,
    })
    
    let txResult
    try {
      // Check if this is a Smart Account (new) or EOA (old)
      const smartAccountName = walletRecord.server_wallet_id
      
      if (!smartAccountName || !smartAccountName.startsWith('yaynay-')) {
        // This is an old EOA wallet - use regular sendTransaction
        console.log('[send-transaction] Using EOA (old wallet) - requires gas funding')
        
        txResult = await cdp.evm.sendTransaction({
          address: walletRecord.server_wallet_address,
          network: networkId,
          transaction,
        })
        
        console.log('[send-transaction] EOA transaction result:', txResult)
      } else {
        // This is a Smart Account - use sendUserOperation for gasless transaction
        console.log('[send-transaction] Using Smart Account for gasless transaction')
        
        const ownerName = smartAccountName.replace('yaynay-smart-', 'yaynay-owner-')
      
        console.log('[send-transaction] Loading Smart Account:', { smartAccountName, ownerName })
        
        const owner = await cdp.evm.getOrCreateAccount({ name: ownerName })
        const smartAccount = await cdp.evm.getOrCreateSmartAccount({
          name: smartAccountName,
          owner,
        })
        
        // Convert transaction to user operation call format
        const calls = [{
          to: transaction.to,
          value: BigInt(transaction.value),
          data: transaction.data || '0x',
        }]
        
        console.log('[send-transaction] Sending user operation with calls:', calls)
        
        // Send user operation - automatically uses CDP Paymaster on Base!
        const userOperation = await smartAccount.sendUserOperation({
          network: networkId,
          calls,
        })
        
        console.log('[send-transaction] User operation sent:', userOperation.hash)
        
        // Wait for confirmation
        const receipt = await smartAccount.waitForUserOperation(userOperation)
        
        console.log('[send-transaction] ✅ Transaction confirmed (gasless via Paymaster):', receipt)
        
        txResult = {
          transactionHash: receipt.transactionHash || userOperation.hash,
          userOperationHash: userOperation.hash,
        }
      }
    } catch (cdpError) {
      console.error('[send-transaction] Transaction failed:', {
        error: cdpError,
        message: cdpError instanceof Error ? cdpError.message : 'Unknown CDP error',
        stack: cdpError instanceof Error ? cdpError.stack : undefined,
      })
      
      throw cdpError
    }

    return new Response(
      JSON.stringify({
        transactionHash: txResult.transactionHash,
        status: 'success',
        message: 'Transaction sent successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-transaction] Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send transaction', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

