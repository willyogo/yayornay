import { Address, parseEther, formatEther } from 'viem';
import { createTradeCall, setApiKey, type TradeParameters } from '@zoralabs/coins-sdk';
import type { GenerateBuyCoinParams, GeneratedTradeData } from '../types/buyCoin';

/**
 * Generate a buy coin transaction using Zora Coins SDK
 *
 * This function generates the optimal swap transaction through Uniswap v4
 * with Zora hooks for purchasing creator or content coins.
 *
 * @param params - Parameters for the coin purchase
 * @returns Generated trade data with target, calldata, and value
 * @throws Error if SDK fails to generate trade call
 */
export async function generateBuyCoinTransaction(
  params: GenerateBuyCoinParams
): Promise<GeneratedTradeData> {
  const { coinAddress, ethAmount, slippage, treasuryAddress } = params;

  // Set API key if available (optional for read operations)
  const apiKey = import.meta.env.VITE_ZORA_API_KEY;
  if (apiKey) {
    setApiKey(apiKey);
  }

  // Build trade parameters for SDK
  const tradeParameters: TradeParameters = {
    sell: { type: 'eth' }, // Selling ETH
    buy: { type: 'erc20', address: coinAddress }, // Buying ERC-20 coin
    amountIn: parseEther(ethAmount), // Convert ETH to wei
    slippage: parseFloat(slippage) / 100, // Convert percentage to decimal (5% -> 0.05)
    sender: treasuryAddress, // Treasury sends ETH
    recipient: treasuryAddress, // Treasury receives coins
  };

  // Generate trade call via Zora SDK
  const quote = await createTradeCall(tradeParameters);

  if (!quote?.call) {
    throw new Error('Failed to generate trade call from Zora SDK');
  }

  return {
    target: quote.call.target as Address,
    calldata: quote.call.data as `0x${string}`,
    value: formatEther(BigInt(quote.call.value)), // Convert wei back to ETH string
  };
}

/**
 * Validate that a coin address is valid
 *
 * @param address - The coin address to validate
 * @returns True if valid Ethereum address
 */
export function isValidCoinAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate that an ETH amount is valid
 *
 * @param amount - The ETH amount string to validate
 * @returns True if valid positive number
 */
export function isValidEthAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

/**
 * Validate that slippage is within acceptable range
 *
 * @param slippage - The slippage percentage string to validate
 * @returns True if between 0 and 100
 */
export function isValidSlippage(slippage: string): boolean {
  const num = parseFloat(slippage);
  return !isNaN(num) && num >= 0 && num <= 100;
}
