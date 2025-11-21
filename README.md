yayornay

Abstract: Nounish DAO focused on accumulating a treasury of top creator coins. Anyone can submit a creator for consideration (candidate proposal). Additionally AI agent can scan creators to queue proposals (out of scope for this repository). Members purchase votes/NFTs via auction. Core UX is inspired by tinder. Proposals are formatted as pfp + scrollable feed of Zora users' past creations and include core details on creator coin (age, market cap, volume, top holders). members vote by swiping left or right (or up to abstain), and if prop passes, treasury purchases the respective creator coin.

Infra:
Nouns.build to deploy contracts, including NFTs, Auctions, Governance, and Treasury
Agent for scanning creator coins and queuing proposals
Web app / mini app for voting, (stretch) viewing past votes, and (stretch) viewing treasury holdings / performance

Art:
Select existing traits that fit
See if nadiecito and fatty can create some custom head traits and accessories

Out of scope:
UI/UX for managing treasury / selling coins

Initial prompt:

Please create an app inspired by the UX of dating apps like Tinder and the UI of Zora. The purpose of the app is to enable users (members of a soon-to-created DAO) to vote on whether or not the DAO should purchase a Zora user's creator coin by easily swiping left (no), right (yes), or up (abstain). The app will be a Farcaster/Base mini app, and should use mini kit to enable seamless wallet login and embedded wallet transaction execution (so when users are swiping left, right, or up (abstain), transactions are built, signed, and executed in the background to publish the user's votes). The user experience should feel super smooth, fun, and gamified.

The cards that users are swiping on will not be potential dates, but rather proposals from a nounish DAO launched from Builder DAO. Each proposal will represent a Zora user and their creator coin. Because this new DAO has not yet been launched, for now let's use Gnars DAO for testing. We should be able to be replace the builder DAO that is the source of proposals by replacing the contract address in the config (Gnars is 0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 (https://nouns.build/dao/base/0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17/). So, each card should be designed to display a cover photo as well as details on their creator coin (age, market cap, volume, 24h change % (green or red)). When a card is opened, users will see a feed of that creators posts/content coins, with details on each posts' content coin (market cap, creator earnings, # of holders, 24h volume).

Users should not feel like they are in a governance app, but rather a fun dating app where the subject of the votes happens to be whether or not the DAO should purchase the respective creator coins.

Later we will add UI/UX for viewing past votes as well as viewing treasury holdings / performance, but for now let's just start with the core voting mechanism.

Users should see a landing page where they can connect their wallet. If a user's wallet holds voting power in the DAO (for now, Gnars DAO, but later we will connect the new DAO).

Nouns.build docs (for querying proposals):
https://docs.nouns.build/onboarding/governance/
https://docs.nouns.build/developers/overview/

Zora docs (for displaying creator profiles and creator coin details):
https://docs.zora.co/coins/sdk/queries/profile
