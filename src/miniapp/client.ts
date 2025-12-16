import type { BetterAuthClientPlugin } from "better-auth/client";
import type { farcasterMiniappAuth } from "./server";
import type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";

/**
 * Type for Farcaster Miniapp client actions
 * Use this type for proper autocomplete when Better Auth's automatic
 * type inference doesn't work with external plugins.
 * 
 * @example
 * ```ts
 * import type { FarcasterMiniappActions } from "better-auth-farcaster-plugin/miniapp/client";
 * 
 * // Access methods with proper types
 * const result = await (authClient as any).farcasterMiniapp.signIn({ token });
 * ```
 */
export interface FarcasterMiniappActions {
    signIn: (data: { token: string }) => Promise<{ data: FarcasterSignInResponse | null; error: any }>;
    link: (data: { token: string }) => Promise<{ data: FarcasterLinkResponse | null; error: any }>;
    unlink: () => Promise<{ data: FarcasterLinkResponse | null; error: any }>;
    profile: () => Promise<{ data: FarcasterProfileResponse | null; error: any }>;
}

/**
 * Helper function to get typed Farcaster Miniapp actions from any authClient.
 * Use this to get proper autocomplete when Better Auth's type inference fails.
 * 
 * @param authClient - Your Better Auth client instance (typed as any)
 * @returns Typed FarcasterMiniappActions object
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterMiniappClient, getFarcasterMiniapp } from "better-auth-farcaster-plugin/miniapp/client";
 * 
 * const authClient = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [farcasterMiniappClient()],
 * });
 * 
 * // Get typed Farcaster methods
 * const farcasterMiniapp = getFarcasterMiniapp(authClient);
 * 
 * // Now you have proper autocomplete!
 * const result = await farcasterMiniapp.signIn({ token: "..." });
 * ```
 */
export function getFarcasterMiniapp(authClient: any): FarcasterMiniappActions {
    return authClient.farcasterMiniapp as FarcasterMiniappActions;
}

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
        getActions: ($fetch: any): FarcasterMiniappActions => ({
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
                    body: {},
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

// Re-export types for convenience
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";
