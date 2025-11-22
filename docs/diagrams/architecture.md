# Architecture Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   React UI   │  │  Wagmi/Viem  │  │ React Query  │    │
│  │   Layer      │  │  (Web3)      │  │  (Cache)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐         ┌─────▼─────┐       ┌─────▼─────┐
    │ Supabase│         │  Base     │       │   Zora    │
    │   DB    │         │ Blockchain│       │   API     │
    └─────────┘         └───────────┘       └───────────┘
```

## Component Hierarchy

```
main.tsx
└── <StrictMode>
    └── <WagmiProvider config={config}>
        └── <QueryClientProvider client={queryClient}>
            └── <App />
                ├── <TestModeContext.Provider>
                │   ├── <LandingPage /> (if !isConnected)
                │   │   └── <WalletConnect />
                │   │
                │   └── <SwipeStack /> (if isConnected)
                │       ├── <ProposalCard /> (current)
                │       ├── <ProposalCard /> (next, preview)
                │       └── Action buttons (for/against/abstain)
                │
                └── <CreatorFeedModal /> (conditional)
                    └── Zora token grid
```

## Data Flow - Proposal Loading

```
1. App mounts
   ↓
2. useProposals(testMode) hook called
   ↓
3. useEffect triggers fetchProposals()
   ↓
4a. If testMode: Return mockProposals
   ↓
4b. Else: Query Supabase
   ├── .from('proposals')
   ├── .eq('dao_address', APP_CONFIG.DAO_ADDRESS)
   ├── .eq('status', 'active')
   └── .order('created_at', { ascending: false })
   ↓
5. setProposals(data)
   ↓
6. SwipeStack receives proposals prop
   ↓
7. Renders ProposalCard for proposals[currentIndex]
```

## Data Flow - Voting

```
1. User swipes card (or clicks button)
   ↓
2. SwipeStack.handleVote(voteType)
   ↓
3. Animation starts (isAnimatingOut = true)
   ↓
4. Call onVote(proposalId, voteType)
   ↓
5. useVoting.submitVote()
   ├── Check wallet connected
   ├── Insert into Supabase 'votes' table
   │   ├── proposal_id
   │   ├── voter_address (from wagmi)
   │   ├── vote_type
   │   ├── voting_power: 1 (hardcoded)
   │   └── transaction_hash: mock (0x + timestamp)
   └── Handle errors
   ↓
6. After 400ms delay: Move to next card
   ↓
7. Reset card position
```

## Data Flow - Creator Feed

```
1. User clicks ProposalCard
   ↓
2. App.setSelectedProposal(proposal)
   ↓
3. CreatorFeedModal mounts
   ↓
4. useEffect triggers loadCreatorTokens()
   ↓
5. Zora API call: getCreatorProfile(creator_address)
   ├── ZDK.tokens({ where: { ownerAddresses: [address] } })
   └── Transform response to CreatorToken[]
   ↓
6. setTokens(profile.tokens)
   ↓
7. Render grid of tokens
```

## Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Components  │  │   Styling    │  │  Animations  │ │
│  │  (React)     │  │  (Tailwind)  │  │  (CSS)       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Props & Callbacks
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ useProposals │  │  useVoting   │  │  State Mgmt  │ │
│  │   (Hook)     │  │   (Hook)     │  │  (Context)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Supabase   │  │    Wagmi     │  │    Zora     │ │
│  │   Client     │  │   (Web3)     │  │     ZDK     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Network Requests
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Supabase    │  │   Base       │  │    Zora      │ │
│  │  PostgreSQL  │  │  Blockchain  │  │    API       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTION                         │
│              (Swipe, Click, Connect)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              EVENT HANDLER                              │
│         (Component onClick/onPointer)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CUSTOM HOOK                                │
│    (useVoting, useProposals)                            │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  useState    │        │  External     │
│  (Local)     │        │  Service     │
└──────┬───────┘        │  (API Call)   │
       │                └──────┬────────┘
       │                       │
       └───────────┬───────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              STATE UPDATE                               │
│    (setState, Wagmi state, React Query cache)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              RE-RENDER                                  │
│         (React reconciliation)                          │
└─────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────────────────────┐
│         proposals                │
│  ─────────────────────────────  │
│  id (uuid, PK)                  │
│  dao_address (text)              │◄──┐
│  proposal_id (text)              │   │
│  creator_address (text)          │   │
│  creator_username (text)         │   │
│  title (text)                    │   │
│  description (text)              │   │
│  cover_image_url (text)          │   │
│  status (text)                    │   │
│  created_at (timestamptz)        │   │
│  updated_at (timestamptz)        │   │
│                                  │   │
│  UNIQUE(dao_address, proposal_id)│   │
│  INDEX(dao_address)              │   │
│  INDEX(status)                   │   │
└──────────────────────────────────┘   │
                                       │
                                       │ FK
                                       │
┌─────────────────────────────────┐   │
│            votes                 │   │
│  ─────────────────────────────  │   │
│  id (uuid, PK)                  │   │
│  proposal_id (uuid, FK) ─────────┼───┘
│  voter_address (text)           │
│  vote_type (text)                │
│    CHECK IN ('for', 'against',   │
│              'abstain')          │
│  transaction_hash (text)         │
│  voting_power (numeric)          │
│  voted_at (timestamptz)         │
│                                  │
│  UNIQUE(proposal_id, voter_address)
│  INDEX(proposal_id)              │
│  INDEX(voter_address)            │
└──────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT APP                           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   React UI   │  │   Wagmi      │  │ React Query  │ │
│  │   Components │  │   (Web3)     │  │   (Cache)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │ HTTP/REST        │ JSON-RPC         │ GraphQL
          │                  │                  │
    ┌─────▼──────┐    ┌──────▼──────┐    ┌─────▼──────┐
    │  Supabase  │    │   Base      │    │   Zora     │
    │  API       │    │  Blockchain │    │   API      │
    │            │    │             │    │            │
    │ PostgreSQL│    │  RPC Node   │    │  GraphQL   │
    │  Database  │    │  (Coinbase) │    │  Endpoint  │
    └────────────┘    └─────────────┘    └────────────┘
```

## File Structure Map

```
yayornay/
│
├── src/
│   ├── main.tsx                    # Entry point, providers
│   ├── App.tsx                     # Root component, routing logic
│   │
│   ├── components/                 # Presentation layer
│   │   ├── LandingPage.tsx        # Auth gate UI
│   │   ├── SwipeStack.tsx         # Core swipe logic
│   │   ├── ProposalCard.tsx       # Card presentation
│   │   ├── CreatorFeedModal.tsx   # Detail modal
│   │   └── WalletConnect.tsx      # Wallet UI
│   │
│   ├── hooks/                      # Business logic layer
│   │   ├── useProposals.ts        # Proposal fetching
│   │   └── useVoting.ts           # Vote submission
│   │
│   ├── lib/                        # Data access layer
│   │   ├── supabase.ts            # DB client & types
│   │   ├── wagmi.ts               # Web3 config
│   │   └── zora.ts                # Zora API client
│   │
│   ├── config/                     # Configuration
│   │   └── app.ts                 # App constants
│   │
│   └── index.css                   # Global styles
│
├── supabase/
│   └── migrations/                # Database schema
│       └── 20251121042518_*.sql
│
└── docs/                           # Documentation
    ├── architecture/              # Architecture docs
    ├── api/                       # API references
    ├── database/                  # Database docs
    └── diagrams/                  # Visual diagrams
```

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - System architecture
- [Component Architecture](../architecture/components.md) - Component details
- [Data Flow](../architecture/data-flow.md) - Data flow patterns

