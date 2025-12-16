import type { BetterAuthClientPlugin } from "better-auth/client";
import type { farcasterCoreAuth } from "./server";

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
        /**
         * Infer server plugin endpoints for proper type inference.
         * This enables Better Auth to automatically generate typed methods
         * for all /farcaster/* endpoints defined in the server plugin.
         */
        $InferServerPlugin: {} as ReturnType<typeof farcasterCoreAuth>,
        /**
         * Explicitly specify HTTP methods for endpoints.
         * By default, Better Auth uses GET for endpoints without request bodies.
         * Since our endpoints are defined as POST on the server, we need to
         * specify this explicitly for the client to make correct requests.
         */
        pathMethods: {
            "/farcaster/create-channel": "POST",
            "/farcaster/channel-status": "POST",
            "/farcaster/verify-signature": "POST",
            "/farcaster/link": "POST",
            "/farcaster/unlink": "POST",
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

export type {
    FarcasterCorePluginOptions,
    SIWFChannelResponse,
    SIWFVerifyParams,
    SIWFVerifyResponse,
} from "./types";
