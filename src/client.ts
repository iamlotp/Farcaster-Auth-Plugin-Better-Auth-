// Client-side only exports (safe for browser bundling)
// This entry point does NOT import any server-side code
// This is for backward compatibility - re-exports miniapp client

// Re-export miniapp client plugin for backward compatibility
export { farcasterMiniappClient as farcasterAuthClient, farcasterMiniappClient } from './miniapp/client';
export type { FarcasterMiniappClientPlugin } from './miniapp/client';

// Re-export types (they don't have runtime imports)
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './types';
