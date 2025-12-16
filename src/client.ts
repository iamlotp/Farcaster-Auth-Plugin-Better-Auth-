// Client-side only exports (safe for browser bundling)
// This entry point does NOT import any server-side code
// This is for backward compatibility - re-exports miniapp client

import type {
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './types';

/**
 * Type for Farcaster Miniapp client methods (backward compatible name)
 * Use this type in intersection patterns:
 * `typeof client & { farcaster: FarcasterAuthClient }`
 * 
 * Note: For the new miniapp plugin (id: "farcaster-miniapp"), the property
 * name on the client is "farcasterMiniapp", not "farcaster".
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterAuthClient, type FarcasterAuthClient } from "better-auth-farcaster-plugin";
 * 
 * const client = createAuthClient({
 *   baseURL: process.env.NEXT_PUBLIC_APP_URL,
 *   plugins: [farcasterAuthClient()],
 * });
 * 
 * // Cast with intersection type - preserves base client types
 * export const authClient = client as typeof client & { 
 *   farcasterMiniapp: FarcasterAuthClient 
 * };
 * 
 * // Now you have autocomplete for both!
 * await authClient.farcasterMiniapp.signIn({ token: "..." });
 * await authClient.signIn.social({ provider: "twitter" });
 * ```
 */
export interface FarcasterAuthClient {
    signIn: (data: { token: string }) => Promise<{ data: FarcasterSignInResponse | null; error: any }>;
    link: (data: { token: string }) => Promise<{ data: FarcasterLinkResponse | null; error: any }>;
    unlink: () => Promise<{ data: FarcasterLinkResponse | null; error: any }>;
    profile: () => Promise<{ data: FarcasterProfileResponse | null; error: any }>;
}

// Re-export miniapp client plugin for backward compatibility
export { farcasterMiniappClient as farcasterAuthClient, farcasterMiniappClient, getFarcasterMiniapp } from './miniapp/client';

// Re-export action types for those who need them
export type { FarcasterMiniappActions } from './miniapp/client';

// Re-export types (they don't have runtime imports)
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from './types';
