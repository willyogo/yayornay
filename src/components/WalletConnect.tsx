import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut } from 'lucide-react';
import { EnsName } from './EnsName';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-200 shadow-[0_15px_50px_rgba(52,211,153,0.35)] hover:border-white/40 hover:bg-white/15 hover:scale-[1.01]"
      >
        <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
        <span className="font-semibold tracking-tight">
          <EnsName address={address} className="font-medium" />
        </span>
        <LogOut className="w-4 h-4 opacity-80" />
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-200 to-fuchsia-400 text-gray-900 font-semibold text-lg tracking-tight shadow-[0_20px_70px_rgba(236,72,153,0.35)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_24px_80px_rgba(52,211,153,0.35)]"
    >
      <Wallet className="w-5 h-5" />
      swipe now
    </button>
  );
}
