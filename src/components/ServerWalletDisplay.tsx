import { useState } from 'react';
import { Copy, Check, Send, Wallet, ExternalLink, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { useServerWallet } from '../hooks/useServerWallet';
import { parseEther } from 'viem';
import { supabase, supabaseUrl } from '../lib/supabase';
import { CHAIN_CONFIG, getCdpNetwork } from '../config/constants';

export function ServerWalletDisplay() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { serverWalletAddress, loading, error: walletError, errorDetails, walletId } = useServerWallet();
  const [copied, setCopied] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendErrorDetails, setSendErrorDetails] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
    setSendErrorDetails(null);
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

      const requestBody = {
        userAddress: address,
        to: recipientAddress,
        amount: amountWei,
        currency: 'ETH',
      };

      console.log('[ServerWalletDisplay] Sending transaction:', requestBody);
      
      const { data, error: invokeError } = await supabase.functions.invoke('send-transaction', {
        body: requestBody,
      });

      console.log('[ServerWalletDisplay] send-transaction response:', {
        data,
        error: invokeError,
        status: (invokeError as any)?.status,
      });

      if (invokeError) {
        const errorInfo = {
          message: invokeError.message || 'Failed to send transaction',
          statusCode: (invokeError as any)?.status,
          errorDetails: invokeError,
          functionName: 'send-transaction',
          requestBody,
          timestamp: new Date().toISOString(),
        };
        setSendErrorDetails(errorInfo);
        throw new Error(errorInfo.message);
      }

      if (data?.error) {
        const errorInfo = {
          message: data.error,
          errorDetails: data,
          functionName: 'send-transaction',
          requestBody,
          timestamp: new Date().toISOString(),
        };
        setSendErrorDetails(errorInfo);
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      if (!sendErrorDetails) {
        setSendErrorDetails({
          message: errorMessage,
          errorDetails: err,
          timestamp: new Date().toISOString(),
        });
      }
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
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Error loading server wallet</span>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700 font-medium">{walletError}</p>
            {errorDetails?.statusCode && (
              <p className="text-xs text-red-600 mt-1">HTTP Status: {errorDetails.statusCode}</p>
            )}
          </div>
          
          {/* Debug Information */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                <span>Debug Information</span>
              </div>
              {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDebug && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 text-xs font-mono">
                <div>
                  <div className="text-gray-500 mb-1">Error Details:</div>
                  <pre className="bg-white p-2 rounded border overflow-auto max-h-48">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Environment:</div>
                  <div className="bg-white p-2 rounded border space-y-1">
                    <div>Chain ID: {chainId}</div>
                    <div>Network: {networkName}</div>
                    <div>CDP Network: {getCdpNetwork()}</div>
                    <div>Supabase URL: {supabaseUrl}</div>
                    <div>User Address: {address}</div>
                    {errorDetails?.functionName && <div>Function: {errorDetails.functionName}</div>}
                    {errorDetails?.timestamp && <div>Timestamp: {errorDetails.timestamp}</div>}
                  </div>
                </div>
                {errorDetails?.requestBody && (
                  <div>
                    <div className="text-gray-500 mb-1">Request Body:</div>
                    <pre className="bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(errorDetails.requestBody, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
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
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-3">
            <div className="text-sm text-red-700">
              <p className="font-medium">{error}</p>
              {sendErrorDetails?.statusCode && (
                <p className="text-xs text-red-600 mt-1">HTTP Status: {sendErrorDetails.statusCode}</p>
              )}
            </div>
            
            {/* Debug Information for Send Errors */}
            <div className="border border-red-200 rounded">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full flex items-center justify-between p-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bug className="w-3 h-3" />
                  <span>Show Debug Info</span>
                </div>
                {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showDebug && sendErrorDetails && (
                <div className="p-3 bg-red-50 border-t border-red-200 space-y-2 text-xs font-mono">
                  <div>
                    <div className="text-red-600 mb-1">Error Details:</div>
                    <pre className="bg-white p-2 rounded border overflow-auto max-h-48 text-xs">
                      {JSON.stringify(sendErrorDetails, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-red-600 mb-1">Environment:</div>
                    <div className="bg-white p-2 rounded border space-y-1">
                      <div>Chain ID: {chainId}</div>
                      <div>Network: {networkName}</div>
                      <div>CDP Network: {getCdpNetwork()}</div>
                      <div>Supabase URL: {supabaseUrl}</div>
                      <div>Server Wallet: {serverWalletAddress || 'N/A'}</div>
                      <div>Wallet ID: {walletId || 'N/A'}</div>
                      {sendErrorDetails.timestamp && <div>Timestamp: {sendErrorDetails.timestamp}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

      {/* Debug Panel (always visible in case of issues) */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            <span>Debug Information</span>
          </div>
          {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDebug && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 text-xs font-mono">
            <div>
              <div className="text-gray-500 mb-1 font-semibold">Environment:</div>
              <div className="bg-white p-2 rounded border space-y-1">
                <div>Chain ID: {chainId}</div>
                <div>Network: {networkName}</div>
                <div>CDP Network: {getCdpNetwork()}</div>
                <div>Supabase URL: {supabaseUrl}</div>
                <div>Is Mainnet: {isMainnet ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1 font-semibold">Wallet Info:</div>
              <div className="bg-white p-2 rounded border space-y-1">
                <div>User Address: {address}</div>
                <div>Server Wallet: {serverWalletAddress || 'N/A'}</div>
                <div>Wallet ID: {walletId || 'N/A'}</div>
              </div>
            </div>
            {errorDetails && (
              <div>
                <div className="text-gray-500 mb-1 font-semibold">Last Error:</div>
                <pre className="bg-white p-2 rounded border overflow-auto max-h-48 text-xs">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
