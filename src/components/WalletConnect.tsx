import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all duration-200 shadow-lg"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="font-medium">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <LogOut className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold text-lg"
    >
      <Wallet className="w-5 h-5" />
      Login
    </button>
  );
}
