// Server plugin exports (server-side only)
// For client-side code, import from 'better-auth-farcaster-plugin/client'
export { farcasterAuth } from './FarcasterAuth';
export type {
    FarcasterPluginOptions,
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './FarcasterAuth';

// NOTE: Client exports are now in a separate entry point to avoid bundling server-side code
// Import from 'better-auth-farcaster-plugin/client' for:
//   - farcasterAuthClient
// Import from 'better-auth-farcaster-plugin/react' for:
//   - useFarcasterSignIn
//   - useFarcasterLink