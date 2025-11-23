# Delegation API Reference

## Overview

Nouns Builder DAOs use **ERC-5805** (Voting with Delegation) for vote delegation. Token holders can delegate their voting power to another address, allowing delegates to vote on proposals on behalf of the delegator.

## How Delegation Works

### Basic Flow

1. **Token Holder** owns NFTs (each NFT = 1 vote)
2. **Delegation**: Token holder calls `delegate(address)` on the token contract to delegate voting power
3. **Voting**: Delegate can now vote using the combined voting power of all delegators
4. **Vote Calculation**: When voting, the Governor contract checks `getVotes(delegate, snapshot)` which includes:
   - Votes from NFTs owned by the delegate
   - Votes from NFTs delegated to the delegate

### Key Concepts

- **Self-Delegation**: By default, token holders delegate to themselves (can vote directly)
- **Delegation is per-account**: You delegate ALL your voting power, not individual NFTs
- **Snapshot-based**: Voting power is calculated at the proposal snapshot block
- **Re-delegation**: You can change your delegate at any time

## Token Contract Functions

The Builder DAO SDK's `tokenAbi` includes these delegation functions:

### `delegate(address _to)`

Delegates all voting power to the specified address.

```typescript
import { tokenAbi } from '@buildeross/sdk';
import { writeContract } from 'wagmi/actions';

// Delegate voting power to an address
await writeContract({
  address: CONTRACTS.NFT, // Token contract address
  abi: tokenAbi,
  functionName: 'delegate',
  args: ['0x...'], // Delegate address
});
```

**Parameters:**
- `_to`: Address to delegate voting power to

**Events:**
- `DelegateChanged(delegator, fromDelegate, toDelegate)`
- `DelegateVotesChanged(delegate, previousBalance, newBalance)`

### `delegateBySig(...)`

Delegates voting power using a signature (for gasless delegation).

```typescript
await writeContract({
  address: CONTRACTS.NFT,
  abi: tokenAbi,
  functionName: 'delegateBySig',
  args: [
    delegatorAddress,  // _from
    delegateAddress,   // _to
    deadline,          // _deadline (timestamp)
    v,                 // _v (signature component)
    r,                 // _r (signature component)
    s,                 // _s (signature component)
  ],
});
```

**Use Cases:**
- Gasless delegation (delegator signs off-chain, someone else submits)
- Batch delegation operations
- Integration with wallet services

### `delegates(address _account)`

Gets the current delegate for an account.

```typescript
import { readContract } from 'wagmi/actions';

const delegate = await readContract({
  address: CONTRACTS.NFT,
  abi: tokenAbi,
  functionName: 'delegates',
  args: [accountAddress],
});
// Returns: address of the delegate (or account itself if self-delegated)
```

### `getVotes(address _account)`

Gets the current voting power of an account (includes delegated votes).

```typescript
const votingPower = await readContract({
  address: CONTRACTS.NFT,
  abi: tokenAbi,
  functionName: 'getVotes',
  args: [accountAddress],
});
// Returns: uint256 - total voting power
```

### `getPastVotes(address _account, uint256 _timestamp)`

Gets voting power at a specific timestamp (used for proposal snapshots).

```typescript
const snapshotVotingPower = await readContract({
  address: CONTRACTS.NFT,
  abi: tokenAbi,
  functionName: 'getPastVotes',
  args: [accountAddress, snapshotTimestamp],
});
```

**Important**: This is what the Governor uses to determine voting power at proposal creation time.

## Governor Contract Functions

The Governor contract (`governorAbi`) also has voting power functions:

### `getVotes(address _account, uint256 _timestamp)`

Gets voting power at a specific timestamp (calls token contract internally).

```typescript
import { governorAbi } from '@buildeross/sdk';

const votingPower = await readContract({
  address: CONTRACTS.GOVERNOR,
  abi: governorAbi,
  functionName: 'getVotes',
  args: [accountAddress, proposalSnapshotTimestamp],
});
```

## Implementation Example

### Check Current Delegate

```typescript
import { useReadContract } from 'wagmi';
import { tokenAbi } from '@buildeross/sdk';
import { CONTRACTS } from '../config/constants';

function useDelegate(accountAddress: string) {
  const { data: delegate } = useReadContract({
    address: CONTRACTS.NFT,
    abi: tokenAbi,
    functionName: 'delegates',
    args: [accountAddress as `0x${string}`],
  });
  
  return delegate;
}
```

### Delegate Voting Power

```typescript
import { useWriteContract } from 'wagmi';
import { tokenAbi } from '@buildeross/sdk';
import { CONTRACTS } from '../config/constants';

function useDelegation() {
  const { writeContract, isPending } = useWriteContract();
  
  const delegate = async (to: string) => {
    await writeContract({
      address: CONTRACTS.NFT,
      abi: tokenAbi,
      functionName: 'delegate',
      args: [to as `0x${string}`],
    });
  };
  
  return { delegate, isPending };
}
```

### Get Voting Power (Current)

```typescript
function useVotingPower(accountAddress: string) {
  const { data: votes } = useReadContract({
    address: CONTRACTS.NFT,
    abi: tokenAbi,
    functionName: 'getVotes',
    args: [accountAddress as `0x${string}`],
  });
  
  return votes ? Number(votes) : 0;
}
```

### Get Voting Power at Proposal Snapshot

```typescript
function useProposalVotingPower(accountAddress: string, proposalSnapshot: bigint) {
  const { data: votes } = useReadContract({
    address: CONTRACTS.GOVERNOR,
    abi: governorAbi,
    functionName: 'getVotes',
    args: [accountAddress as `0x${string}`, proposalSnapshot],
  });
  
  return votes ? Number(votes) : 0;
}
```

## Events

### `DelegateChanged`

Emitted when a delegation changes.

```solidity
event DelegateChanged(
  address indexed delegator,
  address indexed fromDelegate,
  address indexed toDelegate
);
```

### `DelegateVotesChanged`

Emitted when voting power changes for a delegate.

```solidity
event DelegateVotesChanged(
  address indexed delegate,
  uint256 previousBalance,
  uint256 newBalance
);
```

## Important Notes

1. **Self-Delegation**: If you own NFTs but haven't explicitly delegated, you're self-delegated (can vote directly)

2. **Voting Power Calculation**: 
   - Owned NFTs: Direct ownership = 1 vote per NFT
   - Delegated NFTs: Delegated votes = sum of all NFTs delegated to you
   - Total = Owned + Delegated

3. **Proposal Snapshots**: Voting power is locked at the proposal snapshot block. Changes to delegation after snapshot don't affect that proposal.

4. **Re-delegation**: You can change your delegate at any time, but it only affects future proposals (not already-created proposals).

5. **Zero Address**: Delegating to `address(0)` is not allowed. You must delegate to a valid address or yourself.

## Resources

- [ERC-5805: Voting with Delegation](https://eips.ethereum.org/EIPS/eip-5805)
- [OpenZeppelin Governor Documentation](https://docs.openzeppelin.com/contracts/4.x/api/governance)
- [Nouns DAO Governance Explained](https://www.nouns.com/learn/nouns-dao-governance-explained)
- [Builder DAO SDK](https://www.npmjs.com/package/@buildeross/sdk)

