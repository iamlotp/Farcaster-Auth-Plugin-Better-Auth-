// Miniapp server plugin exports (uses @farcaster/quick-auth for JWT verification)
export { farcasterMiniappAuth, farcasterMiniappAuth as farcasterAuth } from './server';
export type {
    FarcasterMiniappPluginOptions,
    FarcasterMiniappPluginOptions as FarcasterPluginOptions,
} from './server';

// Re-export shared types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from '../types';
