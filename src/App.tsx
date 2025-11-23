import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { LandingPage } from './components/LandingPage';
import { AuctionPage } from './components/AuctionPage';
import { SwipeStack } from './components/SwipeStack';
import { useProposals } from './hooks/useProposals';
import { useVoting } from './hooks/useVoting';
import { AppHeader } from './components/AppHeader';
import { SubmitPage } from './components/SubmitPage';
import { DirectProposalPage } from './components/DirectProposalPage';
import { ServerWalletDisplay } from './components/ServerWalletDisplay';
import { DelegationModal } from './components/DelegationModal';
import { AppView } from './types/view';
import { VotedProposalsProvider, useVotedProposals } from './contexts/VotedProposalsContext';

// Get test mode from URL query parameter
const getTestModeFromURL = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.get('test') === 'true';
};

const TestModeContext = createContext<{
  testMode: boolean;
  setTestMode: (mode: boolean) => void;
}>({
  testMode: false,
  setTestMode: () => {}, // No-op since test mode is now controlled by URL query parameter
});

export const useTestMode = () => useContext(TestModeContext);

function AppContent() {
  const { isConnected, address } = useAccount();
  const [testMode] = useState(() => getTestModeFromURL());
  const [view, setView] = useState<AppView>('landing');
  // Pass user address to only fetch proposals they haven't voted on
  const { proposals, loading } = useProposals(testMode, address);
  const {
    submitVote,
    needsDelegation,
    isDelegated,
    serverWalletAddress,
    clearDelegationNeeded,
  } = useVoting();
  const { addVotedProposal } = useVotedProposals();
  const [showDelegationModal, setShowDelegationModal] = useState(false);

  // Wrap submitVote to track votes immediately in context
  const handleVote = async (proposalId: string, voteType: 'for' | 'against' | 'abstain') => {
    try {
      // Add to voted proposals context immediately (optimistic update)
      addVotedProposal(proposalId, voteType);

      // Submit vote in background (no need to refetch immediately)
      await submitVote(proposalId, voteType);
    } catch (error) {
      // Check if error is delegation required
      if (error instanceof Error && error.message === 'DELEGATION_REQUIRED') {
        setShowDelegationModal(true);
        // Don't add to voted proposals if delegation is needed
        // The user hasn't actually voted yet
      } else {
        throw error; // Re-throw other errors
      }
    }
  };

  // Handle delegation completion
  const handleDelegated = () => {
    clearDelegationNeeded();
    setShowDelegationModal(false);
    // The useDelegation hook will automatically refetch delegation status
  };
  
  // Track the view before connecting to return to it after login
  const previousViewRef = useRef<AppView | null>(null);
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
      console.log('User wallet connected:', address);

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
      <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
        {view === 'auction' ? (
          <AuctionPage onSelectView={setView} currentView={view} />
        ) : view === 'submit' ? (
          <SubmitPage onSelectView={setView} currentView={view} />
        ) : view === 'propose' ? (
          <DirectProposalPage onSelectView={setView} currentView={view} />
        ) : view === 'wallet' ? (
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <AppHeader view={view} onChange={setView} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-8">
                <ServerWalletDisplay />
              </div>
            </main>
          </div>
        ) : (
          <LandingPage onBecomeVoter={() => setView('auction')} />
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
      <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
        <AuctionPage
          onSelectView={setView}
          currentView={view}
        />
      </TestModeContext.Provider>
    );
  }

  if (view === 'submit') {
    return (
      <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
        <SubmitPage onSelectView={setView} currentView={view} />
      </TestModeContext.Provider>
    );
  }

  if (view === 'propose') {
    return (
      <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
        <DirectProposalPage onSelectView={setView} currentView={view} />
      </TestModeContext.Provider>
    );
  }

  if (view === 'wallet') {
    return (
      <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <AppHeader view={view} onChange={setView} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8">
              <ServerWalletDisplay />
            </div>
          </main>
        </div>
      </TestModeContext.Provider>
    );
  }

  return (
    <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader view={view} onChange={setView} />

        <SwipeStack
          proposals={proposals}
          onVote={handleVote}
          onSubmitCreator={() => setView('submit')}
          testMode={testMode}
        />

        {/* Delegation Modal */}
        {showDelegationModal && serverWalletAddress && (
          <DelegationModal
            isOpen={showDelegationModal}
            serverWalletAddress={serverWalletAddress}
            onClose={() => setShowDelegationModal(false)}
            onDelegated={handleDelegated}
          />
        )}
      </div>
    </TestModeContext.Provider>
  );
}

function App() {
  return (
    <VotedProposalsProvider>
      <AppContent />
    </VotedProposalsProvider>
  );
}

export default App;
