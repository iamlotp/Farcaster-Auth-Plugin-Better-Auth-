// Miniapp server plugin exports (uses @farcaster/quick-auth for JWT verification)
export { farcasterMiniappAuth, farcasterMiniappAuth as farcasterAuth, getFarcasterMiniappApi } from './server';
export type {
    FarcasterMiniappPluginOptions,
    FarcasterMiniappPluginOptions as FarcasterPluginOptions,
    FarcasterMiniappServerActions,
    WithFarcasterMiniapp,
} from './server';

// Miniapp client plugin exports
export { farcasterMiniappClient, getFarcasterMiniapp } from './client';
export type { FarcasterMiniappActions } from './client';

// Re-export shared types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from '../types';
