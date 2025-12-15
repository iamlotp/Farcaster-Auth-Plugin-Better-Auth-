// Client-side only exports (safe for browser bundling)
// This entry point does NOT import any server-side code

// Client plugin exports
export { farcasterAuthClient } from './FarcasterAuthClient';


// Re-export types (they don't have runtime imports)
export type {
    FarcasterUser,
    FarcasterPluginOptions,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './types';
