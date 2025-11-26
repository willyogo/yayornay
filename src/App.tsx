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
import { NoVotesModal } from './components/NoVotesModal';
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
    submitVoteViaServerWallet, 
    isDelegatedToServerWallet, 
    hasVotingPower 
  } = useVoting();
  const { addVotedProposal } = useVotedProposals();

  // Modal state
  const [showNoVotesModal, setShowNoVotesModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  // Store pending vote to execute after delegation
  const [pendingVote, setPendingVote] = useState<{ proposalId: string; voteType: 'for' | 'against' | 'abstain' } | null>(null);

  // Wrap submitVote to track votes immediately in context and handle delegation logic
  const handleVote = async (proposalId: string, voteType: 'for' | 'against' | 'abstain') => {
    console.log('[App] handleVote called:', { proposalId, voteType, hasVotingPower, isDelegatedToServerWallet });
    
    // Check if user has voting power
    if (!hasVotingPower) {
      // Show modal directing them to auction
      console.log('[App] User has no voting power - showing NoVotesModal');
      setShowNoVotesModal(true);
      throw new Error('No voting power'); // Throw to prevent SwipeStack from advancing
    }

    // Check if user has delegated to server wallet
    if (isDelegatedToServerWallet) {
      // Vote via server wallet (invisible voting)
      console.log('[App] User delegated to server wallet - voting via server wallet');
      
      // Add to voted proposals context immediately (optimistic update)
      addVotedProposal(proposalId, voteType);
      
      // Submit vote via server wallet
      try {
        await submitVoteViaServerWallet(proposalId, voteType);
        console.log('[App] Server wallet vote successful');
      } catch (error) {
        console.error('[App] Server wallet vote failed:', error);
        throw error;
      }
    } else {
      // User has voting power but hasn't delegated - show delegation modal
      console.log('[App] User has voting power but NOT delegated - showing DelegationModal');
      
      // Store the pending vote to execute after delegation
      setPendingVote({ proposalId, voteType });
      setShowDelegationModal(true);
      
      throw new Error('Delegation required'); // Throw to prevent SwipeStack from advancing
    }
  };

  // Execute pending vote after successful delegation
  const handleDelegationSuccess = async () => {
    console.log('[App] Delegation successful, executing pending vote:', pendingVote);
    setShowDelegationModal(false);
    
    if (pendingVote) {
      const { proposalId, voteType } = pendingVote;
      setPendingVote(null);
      
      // Now vote via server wallet
      console.log('[App] Voting via server wallet after delegation');
      addVotedProposal(proposalId, voteType);
      
      try {
        await submitVoteViaServerWallet(proposalId, voteType);
        console.log('[App] Server wallet vote successful after delegation');
      } catch (error) {
        console.error('[App] Server wallet vote failed after delegation:', error);
      }
    }
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

        {/* Modals */}
        <NoVotesModal
          isOpen={showNoVotesModal}
          onClose={() => setShowNoVotesModal(false)}
          onGoToAuction={() => {
            setShowNoVotesModal(false);
            setView('auction');
          }}
        />
        
        <DelegationModal
          isOpen={showDelegationModal}
          onClose={() => {
            setShowDelegationModal(false);
            setPendingVote(null); // Clear pending vote if user closes modal
          }}
          onDelegateSuccess={handleDelegationSuccess}
        />
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
