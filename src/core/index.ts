// Core server plugin exports (uses @farcaster/auth-client for channel-based SIWF)
export { farcasterCoreAuth } from './server';
export type {
    FarcasterCorePluginOptions,
    SIWFChannelResponse,
    SIWFVerifyResponse,
} from './server';

// Re-export shared types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from '../types';
