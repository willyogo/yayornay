# Voting Delegation Flow

## Overview

The app now supports three voting scenarios based on user state:

1. **No Voting Power** → Direct to auction page
2. **Has Voting Power but Not Delegated** → Prompt to enable invisible voting
3. **Has Voting Power and Delegated** → Vote via server wallet (invisible/gas-free)

## User Flow

### Scenario 1: User Without NFTs Attempts to Vote

**Trigger**: User tries to vote but `hasVotingPower = false`

**Action**: Show `NoVotesModal`

**Modal Content**:
- Title: "Get Voting Power"
- Message: "Bid on NFTs to vote. 1 NFT is auctioned off every 5 minutes to the highest bidder."
- Emphasis: "1 NFT = 1 vote"
- CTA: "Go to Auction" → Redirects to auction page
- Secondary: "Maybe Later" → Closes modal

### Scenario 2: User With NFTs but Not Delegated

**Trigger**: User tries to vote with `hasVotingPower = true` but `isDelegatedToServerWallet = false`

**Action**: Show `DelegationModal`

**Modal Content**:
- Title: "Enable Invisible Voting"
- Message: "This app supports 'invisible' (and gas-sponsored) voting!"
- Subtitle: "You only need to sign this transaction once. After that, all your votes will be submitted automatically without gas fees."
- CTA: "Activate Invisible Signing" → Calls `delegateToServerWallet()`
- Secondary: "Vote Manually Instead" → Closes modal (user can vote with standard flow)

**On Success**: Shows success state with "Invisible Voting Activated!" message

### Scenario 3: User With NFTs and Delegated

**Trigger**: User tries to vote with `hasVotingPower = true` and `isDelegatedToServerWallet = true`

**Action**: Vote is submitted via server wallet automatically

**Process**:
1. Optimistically update UI (mark proposal as voted)
2. Call `submitVoteViaServerWallet()` which:
   - Encodes the `castVote` function call
   - Sends transaction via Supabase edge function `send-transaction`
   - Server wallet executes the vote on-chain
   - Returns transaction hash
3. Store vote in database for tracking

## Technical Implementation

### New Files Created

1. **`src/hooks/useDelegation.ts`**
   - Checks delegation status using ERC20Votes `delegates()` function
   - Provides `delegateToServerWallet()` to delegate votes
   - Tracks voting power and delegation state

2. **`src/components/NoVotesModal.tsx`**
   - Modal UI for users without voting power
   - Directs users to auction page

3. **`src/components/DelegationModal.tsx`**
   - Modal UI for delegation prompt
   - Handles delegation transaction
   - Shows success state after delegation

### Modified Files

1. **`src/hooks/useVoting.ts`**
   - Added `submitVoteViaServerWallet()` function
   - Integrates with `useDelegation` hook
   - Exports delegation status for use in components

2. **`src/App.tsx`**
   - Modified `handleVote()` to check voting power and delegation
   - Added modal state management
   - Integrated `NoVotesModal` and `DelegationModal`

## Smart Contract Interactions

### Delegation (ERC20Votes)

```solidity
// Check who user delegated to
function delegates(address account) external view returns (address);

// Delegate votes to another address
function delegate(address delegatee) external;

// Check voting power
function getVotes(address account) external view returns (uint256);
```

### Voting via Server Wallet

1. User's NFT voting power is delegated to server wallet
2. Server wallet calls `Governor.castVote(proposalId, support)`
3. Server wallet must have ETH for gas (manual funding required for now)

## Key Benefits

- **Invisible Voting**: After one-time delegation, votes happen automatically
- **Gas-Free**: Server wallet pays for gas (app covers costs)
- **Seamless UX**: No transaction prompts for every vote
- **Fallback**: Users can still vote manually if they prefer

## Notes

- Server wallet must be funded with ETH manually (future: auto-funding)
- Delegation is one-time per user until they revoke
- Users can revoke delegation anytime by delegating to themselves
- Standard paymaster flow still works for non-delegated users with Smart Wallets
