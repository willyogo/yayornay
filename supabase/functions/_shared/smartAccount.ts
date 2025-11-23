// Helper functions for Smart Account operations
// Smart Accounts on Base automatically use CDP Paymaster for gas sponsorship

import { CdpClient } from 'npm:@coinbase/cdp-sdk@latest'

/**
 * Creates a Smart Account with an EOA owner
 * Smart Accounts automatically use CDP Paymaster on Base for gasless transactions
 */
export async function createSmartAccountWithOwner(
  cdp: CdpClient,
  name: string
): Promise<{ ownerAddress: string; smartAccountAddress: string }> {
  // Step 1: Create an EOA to be the owner
  const owner = await cdp.evm.getOrCreateAccount({ name: `${name}-owner` })
  
  // Step 2: Create a Smart Account owned by the EOA
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name,
    owner,
  })
  
  // Get the smart account address
  const smartAccountAddress = smartAccount.address
  
  return {
    ownerAddress: owner.address,
    smartAccountAddress,
  }
}

/**
 * Send a user operation using a Smart Account
 * Automatically uses CDP Paymaster for gas sponsorship on Base
 */
export async function sendUserOperationWithSmartAccount(
  cdp: CdpClient,
  smartAccountName: string,
  network: string,
  calls: Array<{ to: string; value: string | number; data?: string }>
) {
  // Get the smart account by name
  const owner = await cdp.evm.getOrCreateAccount({ name: `${smartAccountName}-owner` })
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: smartAccountName,
    owner,
  })
  
  // Convert calls to proper format
  const formattedCalls = calls.map(call => ({
    to: call.to,
    value: BigInt(call.value),
    data: call.data || '0x',
  }))
  
  // Send user operation - automatically uses CDP Paymaster on Base
  const userOperation = await smartAccount.sendUserOperation({
    network,
    calls: formattedCalls,
  })
  
  // Wait for confirmation
  const receipt = await smartAccount.waitForUserOperation(userOperation)
  
  return {
    userOperationHash: userOperation.hash,
    receipt,
  }
}
