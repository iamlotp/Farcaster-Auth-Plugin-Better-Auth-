import type { BetterAuthClientPlugin } from "better-auth/client";
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
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterMiniappClient, type FarcasterMiniappActions } from "better-auth-farcaster-plugin/miniapp/client";
 * 
 * const client = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [farcasterMiniappClient()],
 * });
 * 
 * // Export with proper types
 * export const authClient = client as typeof client & { farcasterMiniapp: FarcasterMiniappActions };
 * 
 * // Now you have proper autocomplete!
 * const { data } = await authClient.farcasterMiniapp.signIn({ token: "..." });
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
 * const { data: result } = await farcasterMiniapp.signIn({ token: "..." });
 * ```
 */
export function getFarcasterMiniapp(authClient: any): FarcasterMiniappActions {
    return authClient.farcasterMiniapp as FarcasterMiniappActions;
}

/**
 * Farcaster Miniapp authentication client plugin for Better Auth
 * 
 * Note: Better Auth's automatic type inference ($InferServerPlugin) does not work
 * reliably with external npm packages. Use the FarcasterMiniappActions type or
 * getFarcasterMiniapp() helper for proper TypeScript autocomplete.
 * 
 * Methods available on the client:
 * - `authClient.farcasterMiniapp.signIn({ token })` - Sign in with Quick Auth token
 * - `authClient.farcasterMiniapp.link({ token })` - Link Farcaster to existing account
 * - `authClient.farcasterMiniapp.unlink()` - Unlink Farcaster from account
 * - `authClient.farcasterMiniapp.profile()` - Get Farcaster profile for current user
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterMiniappClient, type FarcasterMiniappActions } from "better-auth-farcaster-plugin/miniapp/client";
 * 
 * const client = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [farcasterMiniappClient()],
 * });
 * 
 * // Export with proper types
 * export const authClient = client as typeof client & { farcasterMiniapp: FarcasterMiniappActions };
 * 
 * // Sign in with Farcaster Quick Auth token
 * const { data, error } = await authClient.farcasterMiniapp.signIn({ token });
 * if (data) {
 *   console.log("Signed in as:", data.user);
 * }
 * ```
 */
export const farcasterMiniappClient = () => {
    return {
        id: "farcaster-miniapp",
        getActions: ($fetch: any): FarcasterMiniappActions => ({
            /**
             * Sign in with a Farcaster Quick Auth token
             * @param data - Object containing the Farcaster Quick Auth token
             * @returns The authenticated user and session
             */
            signIn: async (data: { token: string }) => {
                return $fetch("/farcaster-miniapp/sign-in", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Link the current authenticated account to a Farcaster FID
             * @param data - Object containing the Farcaster Quick Auth token
             * @returns Success status and updated user
             */
            link: async (data: { token: string }) => {
                return $fetch("/farcaster-miniapp/link", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Unlink Farcaster from the current authenticated account
             * @returns Success status and updated user
             */
            unlink: async () => {
                return $fetch("/farcaster-miniapp/unlink", {
                    method: "POST",
                    body: {},
                });
            },
            /**
             * Get the Farcaster profile for the current authenticated user
             * @returns The user's Farcaster FID and profile data
             */
            profile: async () => {
                return $fetch("/farcaster-miniapp/profile", {
                    method: "GET",
                });
            },
        }),
        pathMethods: {
            "/farcaster-miniapp/sign-in": "POST",
            "/farcaster-miniapp/link": "POST",
            "/farcaster-miniapp/unlink": "POST",
        },
    } satisfies BetterAuthClientPlugin;
};

// Re-export types for convenience
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";
