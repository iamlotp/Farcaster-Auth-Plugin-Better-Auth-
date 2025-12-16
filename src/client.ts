// Client-side only exports (safe for browser bundling)
// This entry point re-exports miniapp client for backward compatibility

// Re-export miniapp client plugin for backward compatibility
export { farcasterMiniappClient as farcasterAuthClient, farcasterMiniappClient, getFarcasterMiniapp } from './miniapp/client';

// Re-export action types - FarcasterAuthClient is an alias for backward compatibility
export type { FarcasterMiniappActions, FarcasterMiniappActions as FarcasterAuthClient } from './miniapp/client';

// Re-export types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './types';

