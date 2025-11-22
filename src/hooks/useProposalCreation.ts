import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt, simulateContract } from 'wagmi/actions';
import { parseEther } from 'viem';
import { config } from '../lib/wagmi';
import { CONTRACTS, GovernorABI } from '../config/contracts';
import type { BuyCoinTransaction, ProposalTransaction } from '../types/buyCoin';
import { generateBuyCoinTransaction } from '../lib/buyCoinSDK';

export type ProposalCreationStatus = 'idle' | 'generating' | 'submitting' | 'success' | 'error';

export function useProposalCreation() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<ProposalCreationStatus>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);

  /**
   * Create a proposal with a buy coin transaction
   */
  const createBuyCoinProposal = async (
    transaction: BuyCoinTransaction,
    title: string,
    description: string
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setStatus('generating');
    setError(null);
    setTxHash(null);
    setProposalId(null);

    try {
      // Step 1: Generate trade data from Zora SDK
      const tradeData = await generateBuyCoinTransaction({
        coinAddress: transaction.coinAddress,
        ethAmount: transaction.ethAmount,
        slippage: transaction.slippage,
        treasuryAddress: CONTRACTS.TREASURY,
      });

      // Step 2: Encode the transaction for the proposal
      const encodedTransaction: ProposalTransaction = {
        target: tradeData.target,
        value: parseEther(tradeData.value),
        calldata: tradeData.calldata,
      };

      // Step 3: Submit proposal to Governor contract
      setStatus('submitting');

      // Format description with title
      const fullDescription = `${title}&&${description}\n\n---\n\n**Coin Purchase Details:**\n- Coin: ${transaction.coinName || transaction.coinAddress}\n- ETH Amount: ${transaction.ethAmount} ETH\n- Slippage Tolerance: ${transaction.slippage}%`;

      // Try to simulate first for better error handling
      let hash: `0x${string}` | undefined;
      try {
        const simulation = await simulateContract(config, {
          address: CONTRACTS.GOVERNOR,
          abi: GovernorABI,
          functionName: 'propose',
          args: [
            [encodedTransaction.target], // targets
            [encodedTransaction.value], // values
            [encodedTransaction.calldata], // calldatas
            fullDescription, // description
          ],
          account: address,
        });
        hash = await writeContractAsync(simulation.request);
      } catch (simError) {
        // Fallback to direct write if simulation fails
        hash = await writeContractAsync({
          address: CONTRACTS.GOVERNOR,
          abi: GovernorABI,
          functionName: 'propose',
          args: [
            [encodedTransaction.target],
            [encodedTransaction.value],
            [encodedTransaction.calldata],
            fullDescription,
          ],
        });
      }

      if (!hash) throw new Error('No transaction hash returned');

      setTxHash(hash);

      // Wait for transaction confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        timeout: 60_000,
      });

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      // Extract proposal ID from logs if available
      // The ProposalCreated event contains the proposal ID
      // For now, we'll leave it null - it can be fetched from the subgraph later
      setProposalId(null);

      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(errorMessage);
      setStatus('error');
      throw err;
    }
  };

  /**
   * Reset the hook state
   */
  const reset = () => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
    setProposalId(null);
  };

  return {
    createBuyCoinProposal,
    status,
    txHash,
    error,
    proposalId,
    reset,
  };
}
