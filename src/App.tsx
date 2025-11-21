import { useState, createContext, useContext, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { TestTube } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { LandingPage } from './components/LandingPage';
import { SwipeStack } from './components/SwipeStack';
import { CreatorFeedModal } from './components/CreatorFeedModal';
import { useProposals } from './hooks/useProposals';
import { useVoting } from './hooks/useVoting';
import { Proposal } from './lib/supabase';

const TestModeContext = createContext<{
  testMode: boolean;
  setTestMode: (mode: boolean) => void;
}>({
  testMode: false,
  setTestMode: () => {},
});

export const useTestMode = () => useContext(TestModeContext);

function App() {
  const { isConnected } = useAccount();
  const [testMode, setTestMode] = useState(false);
  const { proposals, loading } = useProposals(testMode);
  const { submitVote } = useVoting();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Signal to mini app that the app is ready to display
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  if (!isConnected) {
    return (
      <TestModeContext.Provider value={{ testMode, setTestMode }}>
        <LandingPage />
      </TestModeContext.Provider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">Loading proposals...</p>
        </div>
      </div>
    );
  }

  return (
    <TestModeContext.Provider value={{ testMode, setTestMode }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center">
                <span className="text-white text-xl">💖</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">DAO Swipe</h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTestMode(!testMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  testMode
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <TestTube className="w-4 h-4" />
                {testMode ? 'Test Mode' : 'Test Mode'}
              </button>
              <div className="text-sm text-gray-600">
                {proposals.length} active proposals
              </div>
            </div>
          </div>
        </header>

        <SwipeStack
          proposals={proposals}
          onVote={submitVote}
          onDetailClick={setSelectedProposal}
          testMode={testMode}
        />

        {selectedProposal && (
          <CreatorFeedModal
            proposal={selectedProposal}
            onClose={() => setSelectedProposal(null)}
          />
        )}
      </div>
    </TestModeContext.Provider>
  );
}

export default App;
