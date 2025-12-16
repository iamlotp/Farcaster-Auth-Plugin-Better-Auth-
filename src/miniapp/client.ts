import type { BetterAuthClientPlugin } from "better-auth/client";
import type { farcasterMiniappAuth } from "./server";
import type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";

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
        id: "farcaster-miniapp" as const,
        $InferServerPlugin: {} as ReturnType<typeof farcasterMiniappAuth>,
        getActions: ($fetch: any) => ({
            /**
             * Sign in with Farcaster Quick Auth token
             * @param data - Object containing the token from Farcaster Quick Auth
             * @returns Session and user data
             */
            signIn: async (data: { token: string }) => {
                return $fetch("/farcaster-miniapp/sign-in", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Link Farcaster account to the currently authenticated user
             * @param data - Object containing the token from Farcaster Quick Auth
             * @returns Success status and updated user
             */
            link: async (data: { token: string }) => {
                return $fetch("/farcaster-miniapp/link", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Unlink Farcaster account from the currently authenticated user
             * @returns Success status and updated user
             */
            unlink: async () => {
                return $fetch("/farcaster-miniapp/unlink", {
                    method: "POST",
                });
            },
            /**
             * Get Farcaster profile for the currently authenticated user
             * @returns Farcaster FID and user data
             */
            profile: async () => {
                return $fetch("/farcaster-miniapp/profile", {
                    method: "GET",
                });
            },
        }),
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
