import { formatCurrency, calculate24hChange } from './zora';
import { CONTRACTS } from '../config/constants';
import type { CoinData } from '../hooks/useZoraCoin';

export interface ProposalTemplateData {
  coinData: CoinData;
  ethAmount: string;
  slippage: string;
}

export function generateProposalTitle(coinData: CoinData): string {
  const symbol = coinData.symbol || coinData.name || 'Coin';
  return `Purchase ${coinData.name} (${symbol}) Creator Coin`;
}

export function generateProposalDescription(data: ProposalTemplateData): string {
  const { coinData, ethAmount, slippage } = data;

  const marketCap = formatCurrency(coinData.marketCap);
  const volume24h = formatCurrency(coinData.volume24h);
  const change24h = calculate24hChange(coinData.marketCap, coinData.marketCapDelta24h);
  const holders = coinData.uniqueHolders;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const username = coinData.creatorProfile?.handle ||
                   coinData.creatorProfile?.displayName ||
                   'Unknown';
  const symbol = coinData.symbol || coinData.name || 'Coin';

  return `## SUMMARY
Proposal to purchase ${coinData.name} creator coin for the DAO treasury.

## CREATOR DETAILS
- Username: @${username}
- Coin Address: ${coinData.address}
- Symbol: ${symbol}
- Name: ${coinData.name}

## CURRENT METRICS
- Market Cap: ${marketCap}
- Holders: ${holders.toLocaleString()}
- 24h Volume: ${volume24h}
- 24h Change: ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%

## TRADE PARAMETERS
- ETH Amount: ${ethAmount} ETH
- Slippage: ${slippage}%
- Sender: ${CONTRACTS.TREASURY}
- Recipient: ${CONTRACTS.TREASURY}

## RATIONALE
This proposal aims to diversify the DAO treasury by acquiring ${coinData.name} creator coin. The purchase will be executed through Zora's Uniswap v4 integration with slippage protection of ${slippage}%.

## SOURCE
Data fetched from Zora SDK on ${currentDate}

## TRANSACTION DETAILS
The transaction will swap ${ethAmount} ETH for ${coinData.name} tokens with ${slippage}% maximum slippage tolerance. Both the sender and recipient are the DAO treasury address.`;
}
