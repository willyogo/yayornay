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
import { AppView } from './types/view';

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

function App() {
  const { isConnected, address } = useAccount();
  const [testMode] = useState(() => getTestModeFromURL());
  const [view, setView] = useState<AppView>('landing');
  const { proposals, loading } = useProposals(testMode);
  const { submitVote } = useVoting();
  
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

  return (
    <TestModeContext.Provider value={{ testMode, setTestMode: () => {} }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader view={view} onChange={setView} />

        <SwipeStack
          proposals={proposals}
          onVote={submitVote}
          testMode={testMode}
        />
      </div>
    </TestModeContext.Provider>
  );
}

export default App;
