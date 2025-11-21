# Zora API Reference

## Client Initialization

The Zora ZDK client is initialized in `src/lib/zora.ts` using the ZDK library. It creates a client instance configured to use the Zora GraphQL endpoint at api.zora.co/graphql, set to query the Base Mainnet network.

## Type Definitions

The CreatorProfile interface includes the creator's address, optional username and avatar, and an array of tokens. The CreatorToken interface includes token ID, name, optional description and image URL, token ID, and collection address.

## API Methods

### getCreatorProfile

This function fetches a creator's profile and their tokens by wallet address. It takes a creator address as a parameter and returns a CreatorProfile object or null on error. The function queries Zora's GraphQL API for tokens owned by the address, limits results to 20 tokens, transforms the response into CreatorToken objects, and returns them with the address. On error, it logs to console and returns null.

The function is used in CreatorFeedModal when it mounts with a proposal. The component calls getCreatorProfile with the creator address, and if a profile is returned, it stores the tokens in state for display.

### getCreatorTokensByUsername

This function exists but is not fully implemented. It attempts to fetch creator tokens by username but doesn't correctly filter by username in the current implementation.

## GraphQL Query Structure

The ZDK uses GraphQL under the hood. The actual query requests tokens matching the where clause with pagination limit of 20, and returns token details including tokenId, name, description, image URL, and collectionAddress.

## Current Limitations

The implementation only fetches the first 20 tokens with no pagination support. There is no error retry logic - errors fail silently and return null. There is no caching, so tokens refetch every time the modal opens. The API response uses `any` type instead of fully typed interfaces, and there is no runtime validation of the response structure.

## Error Handling

The current pattern catches errors in try-catch blocks, logs them to console, and returns null. Components that call getCreatorProfile must handle the null case, typically showing an empty state when no profile is returned.

## Rate Limiting

There is no rate limiting currently implemented. The application makes requests directly to Zora's API without throttling or request queuing.

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - System architecture
- [Component Architecture](../architecture/components.md) - Component usage
- [Zora Documentation](https://docs.zora.co/) - Official Zora docs
