import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { TestTube } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { LandingPage } from './components/LandingPage';
import { AuctionPage } from './components/AuctionPage';
import { SwipeStack } from './components/SwipeStack';
import { CreatorFeedModal } from './components/CreatorFeedModal';
import { useProposals } from './hooks/useProposals';
import { useVoting } from './hooks/useVoting';
import { Proposal } from './lib/supabase';

type View = 'landing' | 'auction';

const TestModeContext = createContext<{
  testMode: boolean;
  setTestMode: (mode: boolean) => void;
}>({
  testMode: false,
  setTestMode: () => {},
});

export const useTestMode = () => useContext(TestModeContext);

function App() {
  const { isConnected, address } = useAccount();
  const [testMode, setTestMode] = useState(false);
  const [view, setView] = useState<View>('landing');
  const { proposals, loading } = useProposals(testMode);
  const { submitVote } = useVoting();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  
  // Track the view before connecting to return to it after login
  const previousViewRef = useRef<View | null>(null);
  const wasConnectedRef = useRef(false);

  // Signal to mini app that the app is ready to display
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Track view changes when not connected
  useEffect(() => {
    if (!isConnected) {
      previousViewRef.current = view;
    }
  }, [view, isConnected]);

  // Handle view when wallet connects
  useEffect(() => {
    // Only run when transitioning from disconnected to connected
    if (isConnected && !wasConnectedRef.current && address) {
      wasConnectedRef.current = true;
      
      // Return user to the page they were on before connecting
      // If they were on auction page, keep them there
      // Otherwise, go to landing page (which shows voting interface)
      if (previousViewRef.current) {
        setView(previousViewRef.current);
      } else {
        setView('landing');
      }
    } else if (!isConnected) {
      wasConnectedRef.current = false;
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <TestModeContext.Provider value={{ testMode, setTestMode }}>
        {view === 'landing' ? (
          <LandingPage onBecomeVoter={() => setView('auction')} />
        ) : (
          <AuctionPage onBack={() => setView('landing')} />
        )}
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

  // Show auction page if view is set to auction
  if (view === 'auction') {
    return (
      <TestModeContext.Provider value={{ testMode, setTestMode }}>
        <AuctionPage onBack={() => setView('landing')} />
      </TestModeContext.Provider>
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
                onClick={() => setView('auction')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-blue-500 text-white hover:bg-blue-600"
              >
                <span>🏛️</span>
                Auction
              </button>
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
