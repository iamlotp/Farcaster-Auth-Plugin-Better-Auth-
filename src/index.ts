// Server plugin exports (server-side only)
// This is the root entry point for backward compatibility
// For new code, import from 'better-auth-farcaster-plugin/miniapp' or 'better-auth-farcaster-plugin/core'

// Re-export miniapp server plugin as default for backward compatibility
export { farcasterMiniappAuth as farcasterAuth, farcasterMiniappAuth } from './miniapp';
export type {
    FarcasterMiniappPluginOptions as FarcasterPluginOptions,
    FarcasterMiniappPluginOptions,
} from './miniapp';

// Re-export shared types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './types';

// NOTE: Client exports are now in separate entry points to avoid bundling server-side code
// Import from 'better-auth-farcaster-plugin/client' for backward compatibility (miniapp client)
// Import from 'better-auth-farcaster-plugin/miniapp/client' for miniapp client
// Import from 'better-auth-farcaster-plugin/core/client' for core (OAuth-like) client
//
// Import from 'better-auth-farcaster-plugin/react' for backward compatibility (miniapp React hooks)
// Import from 'better-auth-farcaster-plugin/miniapp/react' for miniapp React hooks
// Import from 'better-auth-farcaster-plugin/core/react' for core (OAuth-like) React hooks