import { useState } from 'react';
import { Copy, Check, Send, Wallet, ExternalLink } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { useServerWallet } from '../hooks/useServerWallet';
import { parseEther } from 'viem';
import { supabase } from '../lib/supabase';
import { CHAIN_CONFIG } from '../config/constants';

export function ServerWalletDisplay() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { serverWalletAddress, loading, error: walletError } = useServerWallet();
  const [copied, setCopied] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!serverWalletAddress) return;
    try {
      await navigator.clipboard.writeText(serverWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTxHash(null);

    if (!serverWalletAddress) {
      setError('Server wallet not available');
      return;
    }

    if (!recipientAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError('Invalid recipient address');
      return;
    }

    // Validate amount
    let amountWei: string;
    try {
      const parsed = parseEther(amount as `${number}`);
      amountWei = parsed.toString();
    } catch (err) {
      setError('Invalid amount. Please enter a valid ETH amount.');
      return;
    }

    setIsSending(true);

    try {
      // Get user's connected wallet address from wagmi
      if (!address) {
        throw new Error('Please connect your wallet first');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('send-transaction', {
        body: {
          userAddress: address,
          to: recipientAddress,
          amount: amountWei,
          currency: 'ETH',
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to send transaction');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.transactionHash) {
        setTxHash(data.transactionHash);
        setSuccess(`Transaction sent successfully!`);
        setRecipientAddress('');
        setAmount('');
      } else {
        throw new Error('No transaction hash returned');
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setIsSending(false);
    }
  };

  // Determine network info based on chain ID
  const isMainnet = chainId === CHAIN_CONFIG.ID; // 8453 = Base Mainnet
  const networkName = isMainnet ? 'Base Mainnet' : 'Base Sepolia';
  const ethLabel = isMainnet ? 'Mainnet ETH' : 'Testnet ETH';

  const getExplorerUrl = (hash: string) => {
    // Use mainnet explorer for Base Mainnet (8453), sepolia explorer for Base Sepolia (84532)
    const explorerBase = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
    return `${explorerBase}/tx/${hash}`;
  };

  if (!isConnected || !address) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 text-gray-600">
          <Wallet className="w-5 h-5" />
          <span>Please connect your wallet first to view your server wallet.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            <span className="text-gray-600">Loading server wallet...</span>
          </div>
          <p className="text-sm text-gray-500">
            Creating or retrieving your CDP-managed server wallet...
          </p>
        </div>
      </div>
    );
  }

  if (walletError) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Error loading server wallet</span>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{walletError}</p>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Connected address: {address}</p>
            <p>Check the browser console for more details.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!serverWalletAddress) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-600">
            <Wallet className="w-5 h-5" />
            <span className="font-medium">No server wallet found</span>
          </div>
          <p className="text-sm text-gray-600">
            We couldn't find or create a server wallet for your address. This might be a temporary issue.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Connected address: {address}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Server Wallet
        </h2>
        <p className="text-sm text-gray-600">
          Your CDP-managed server wallet address on {networkName}
        </p>
      </div>

      {/* Wallet Address Display */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Wallet Address</label>
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <code className="flex-1 text-sm font-mono text-gray-900 break-all">
            {serverWalletAddress}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Send Transaction Form */}
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send {ethLabel}
          </h3>
        </div>

        <div className="space-y-2">
          <label htmlFor="recipient" className="text-sm font-medium text-gray-700">
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            disabled={isSending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium text-gray-700">
            Amount (ETH)
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            pattern="^[0-9]*[.,]?[0-9]*$"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending}
          />
          <p className="text-xs text-gray-500">
            Enter amount in ETH (e.g., 0.001 for 0.001 ETH)
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            <div className="font-medium mb-1">{success}</div>
            {txHash && (
              <a
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-600 hover:text-green-700 underline"
              >
                View on BaseScan
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSending || !recipientAddress || !amount}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50"
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Transaction
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> This wallet is managed by Coinbase Developer Platform. 
          Transactions are signed server-side. Make sure you have ETH in this wallet before sending.
        </p>
      </div>
    </div>
  );
}
