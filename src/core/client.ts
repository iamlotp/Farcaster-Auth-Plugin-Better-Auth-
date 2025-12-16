import type { BetterAuthClientPlugin } from "better-auth/client";
import type { farcasterCoreAuth } from "./server";
import type {
    FarcasterUser,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";
import type {
    SIWFChannelResponse,
    SIWFVerifyResponse,
} from "./types";

/**
 * Type for Farcaster Core (SIWF) client actions
 * Use this type for proper autocomplete when Better Auth's automatic
 * type inference doesn't work with external plugins.
 * 
 * @example
 * ```ts
 * import type { FarcasterCoreActions } from "better-auth-farcaster-plugin/core/client";
 * 
 * // Access methods with proper types
 * const result = await (authClient as any).farcaster.createChannel();
 * ```
 */
export interface FarcasterCoreActions {
    createChannel: (data?: {
        nonce?: string;
        notBefore?: string;
        expirationTime?: string;
        requestId?: string;
    }) => Promise<{ data: SIWFChannelResponse | null; error: any }>;
    channelStatus: (data: { channelToken: string }) => Promise<{ data: any; error: any }>;
    verifySignature: (data: {
        channelToken: string;
        message: string;
        signature: string;
        fid: number;
        username?: string;
        displayName?: string;
        pfpUrl?: string;
        bio?: string;
    }) => Promise<{ data: SIWFVerifyResponse | null; error: any }>;
    link: (data: {
        channelToken: string;
        message: string;
        signature: string;
        fid: number;
    }) => Promise<{ data: FarcasterLinkResponse | null; error: any }>;
    unlink: () => Promise<{ data: FarcasterLinkResponse | null; error: any }>;
    profile: () => Promise<{ data: FarcasterProfileResponse | null; error: any }>;
}

/**
 * Helper function to get typed Farcaster Core actions from any authClient.
 * Use this to get proper autocomplete when Better Auth's type inference fails.
 * 
 * @param authClient - Your Better Auth client instance (typed as any)
 * @returns Typed FarcasterCoreActions object
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterCoreClient, getFarcasterCore } from "better-auth-farcaster-plugin/core/client";
 * 
 * const authClient = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [farcasterCoreClient()],
 * });
 * 
 * // Get typed Farcaster methods
 * const farcaster = getFarcasterCore(authClient);
 * 
 * // Now you have proper autocomplete!
 * const { data: channel } = await farcaster.createChannel();
 * const status = await farcaster.channelStatus({ channelToken: channel.channelToken });
 * ```
 */
export function getFarcasterCore(authClient: any): FarcasterCoreActions {
    return authClient.farcaster as FarcasterCoreActions;
}

/**
 * Farcaster Core authentication client plugin for Better Auth
 * 
 * This plugin uses $InferServerPlugin to automatically infer server endpoints
 * for the channel-based SIWF (Sign In With Farcaster) flow.
 * 
 * Methods available on the client:
 * - `authClient.farcaster.createChannel()` - Create a SIWF channel (returns URL for QR/deeplink)
 * - `authClient.farcaster.channelStatus({ channelToken })` - Poll channel status
 * - `authClient.farcaster.verifySignature({ ... })` - Verify SIWF signature and create session
 * - `authClient.farcaster.link({ ... })` - Link Farcaster to existing account via SIWF
 * - `authClient.farcaster.unlink()` - Unlink Farcaster from account
 * - `authClient.farcaster.profile()` - Get Farcaster profile for current user
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterCoreClient } from "better-auth-farcaster-plugin/core/client";
 * 
 * export const authClient = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [
 *     farcasterCoreClient(),
 *   ],
 * });
 * 
 * // Create a channel for QR code
 * const { data: channel } = await authClient.farcaster.createChannel();
 * console.log("QR Code URL:", channel.url);
 * 
 * // Poll for completion
 * const status = await authClient.farcaster.channelStatus({ 
 *   channelToken: channel.channelToken 
 * });
 * 
 * // When user approves, verify and create session
 * if (status.data.state === 'completed') {
 *   await authClient.farcaster.verifySignature({
 *     channelToken: channel.channelToken,
 *     message: status.data.message,
 *     signature: status.data.signature,
 *     fid: status.data.fid,
 *   });
 * }
 * ```
 */
export const farcasterCoreClient = () => {
    return {
        id: "farcaster" as const,
        $InferServerPlugin: {} as ReturnType<typeof farcasterCoreAuth>,
        pathMethods: {
            "/farcaster/create-channel": "POST",
            "/farcaster/channel-status": "POST",
            "/farcaster/verify-signature": "POST",
            "/farcaster/link": "POST",
            "/farcaster/unlink": "POST",
        },
        getActions: ($fetch: any) => ({
            /**
             * Create a SIWF channel for QR code or deeplink authentication
             * @param data - Optional parameters for the channel
             * @returns Channel token, URL for QR/deeplink, and nonce
             */
            createChannel: async (data?: {
                nonce?: string;
                notBefore?: string;
                expirationTime?: string;
                requestId?: string;
            }) => {
                return $fetch("/farcaster/create-channel", {
                    method: "POST",
                    body: data || {},
                });
            },
            /**
             * Get the status of a SIWF channel (for polling)
             * @param data - Object containing the channel token
             * @returns Current channel status and signature data if completed
             */
            channelStatus: async (data: { channelToken: string }) => {
                return $fetch("/farcaster/channel-status", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Verify a SIWF signature and create a session
             * @param data - Signature verification parameters
             * @returns Success status, user, and session
             */
            verifySignature: async (data: {
                channelToken: string;
                message: string;
                signature: string;
                fid: number;
                username?: string;
                displayName?: string;
                pfpUrl?: string;
                bio?: string;
            }) => {
                return $fetch("/farcaster/verify-signature", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Link Farcaster account to the currently authenticated user via SIWF
             * @param data - Link parameters with signature data
             * @returns Success status and updated user
             */
            link: async (data: {
                channelToken: string;
                message: string;
                signature: string;
                fid: number;
            }) => {
                return $fetch("/farcaster/link", {
                    method: "POST",
                    body: data,
                });
            },
            /**
             * Unlink Farcaster account from the currently authenticated user
             * @returns Success status and updated user
             */
            unlink: async () => {
                return $fetch("/farcaster/unlink", {
                    method: "POST",
                });
            },
            /**
             * Get Farcaster profile for the currently authenticated user
             * @returns Farcaster FID and user data
             */
            profile: async () => {
                return $fetch("/farcaster/profile", {
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

export type {
    FarcasterCorePluginOptions,
    SIWFChannelResponse,
    SIWFVerifyParams,
    SIWFVerifyResponse,
} from "./types";
