// Server plugin exports
export { farcasterAuth } from './FarcasterAuth';
export type {
    FarcasterPluginOptions,
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './FarcasterAuth';

// Client plugin exports
export { farcasterAuthClient } from './FarcasterAuthClient';
export type { FarcasterAuthClient } from './FarcasterAuthClient';