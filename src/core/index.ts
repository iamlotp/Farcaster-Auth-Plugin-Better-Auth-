// Core server plugin exports (uses @farcaster/auth-client for channel-based SIWF)
export { farcasterCoreAuth, getFarcasterCoreApi } from './server';
export type {
    FarcasterCorePluginOptions,
    SIWFChannelResponse,
    SIWFVerifyResponse,
    FarcasterCoreServerActions,
    WithFarcasterCore,
} from './server';

// Re-export client helpers and types
export { farcasterCoreClient, getFarcasterCore } from './client';
export type { FarcasterCoreActions } from './client';

// Type alias for intersection pattern (same as FarcasterCoreActions)
export type { FarcasterCoreActions as FarcasterCoreClient } from './client';

// Re-export shared types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from '../types';

