import { Heart, TrendingUp, Users, TestTube, Gavel } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { useTestMode } from '../App';

interface LandingPageProps {
  onBecomeVoter: () => void;
}

export function LandingPage({ onBecomeVoter }: LandingPageProps) {
  const { testMode, setTestMode } = useTestMode();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <button
          onClick={() => setTestMode(!testMode)}
          className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            testMode
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <TestTube className="w-4 h-4" />
          {testMode ? 'Test Mode ON' : 'Test Mode OFF'}
        </button>
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl mb-4 shadow-2xl">
            <Heart className="w-10 h-10 text-white" fill="currentColor" />
          </div>

          <h1 className="text-6xl font-bold text-white leading-tight">
            Swipe to Govern
          </h1>

          <p className="text-xl text-gray-400 max-w-lg mx-auto leading-relaxed">
            The fun way to vote on DAO proposals. Swipe right to support creator coins, left to pass, up to abstain.
          </p>
        </div>

        <div className="flex justify-center gap-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-2xl mb-2">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-sm text-gray-500">Creator Coins</div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-2xl mb-2">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-sm text-gray-500">Community Votes</div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-pink-500/20 rounded-2xl mb-2">
              <Heart className="w-6 h-6 text-pink-400" />
            </div>
            <div className="text-sm text-gray-500">Smooth UX</div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <WalletConnect />
          <button
            onClick={onBecomeVoter}
            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-all duration-200 font-semibold text-lg"
          >
            <Gavel className="w-5 h-5" />
            Become a Voter
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Connect your wallet to start voting on Gnars DAO proposals
        </p>
      </div>
    </div>
  );
}
