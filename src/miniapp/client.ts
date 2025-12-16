import type { BetterAuthClientPlugin } from "better-auth/client";
import type { farcasterMiniappAuth } from "./server";

/**
 * Farcaster Miniapp authentication client plugin for Better Auth
 * 
 * This plugin uses $InferServerPlugin to automatically infer server endpoints,
 * ensuring proper integration with other Better Auth plugins (e.g., social login).
 * 
 * Methods available on the client:
 * - `authClient.farcasterMiniapp.signIn({ token })` - Sign in with Farcaster Quick Auth
 * - `authClient.farcasterMiniapp.link({ token })` - Link Farcaster to existing account
 * - `authClient.farcasterMiniapp.unlink()` - Unlink Farcaster from account
 * - `authClient.farcasterMiniapp.profile()` - Get Farcaster profile for current user
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterMiniappClient } from "better-auth-farcaster-plugin/miniapp/client";
 * 
 * export const authClient = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [
 *     farcasterMiniappClient(),
 *     // Works alongside other plugins like social auth
 *   ],
 * });
 * 
 * // Use Farcaster auth
 * const result = await authClient.farcasterMiniapp.signIn({ token });
 * 
 * // Social auth still works on the same client
 * await authClient.signIn.social({ provider: "twitter" });
 * ```
 */
export const farcasterMiniappClient = () => {
    return {
        id: "farcaster-miniapp",
        /**
         * Infer server plugin endpoints for proper type inference.
         * This enables Better Auth to automatically generate typed methods
         * for all /farcaster-miniapp/* endpoints defined in the server plugin.
         */
        $InferServerPlugin: {} as ReturnType<typeof farcasterMiniappAuth>,
    } satisfies BetterAuthClientPlugin;
};

// Backward compatible alias
export const farcasterAuthClient = farcasterMiniappClient;

// Re-export types for convenience
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";
