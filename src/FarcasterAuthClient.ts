import type { BetterAuthClientPlugin } from "better-auth/client";
import type { farcasterAuth } from "./FarcasterAuth";

/**
 * Farcaster authentication client plugin for Better Auth
 * 
 * This plugin uses $InferServerPlugin to automatically infer server endpoints,
 * ensuring proper integration with other Better Auth plugins (e.g., social login).
 * 
 * Methods available on the client:
 * - `authClient.farcaster.signIn({ token })` - Sign in with Farcaster Quick Auth
 * - `authClient.farcaster.link({ token })` - Link Farcaster to existing account
 * - `authClient.farcaster.unlink()` - Unlink Farcaster from account
 * - `authClient.farcaster.profile()` - Get Farcaster profile for current user
 * 
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { farcasterAuthClient } from "better-auth-farcaster-plugin/client";
 * 
 * export const authClient = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [
 *     farcasterAuthClient(),
 *     // Works alongside other plugins like social auth
 *   ],
 * });
 * 
 * // Use Farcaster auth
 * const result = await authClient.farcaster.signIn({ token });
 * 
 * // Social auth still works on the same client
 * await authClient.signIn.social({ provider: "twitter" });
 * ```
 */
export const farcasterAuthClient = () => {
    return {
        id: "farcaster",
        /**
         * Infer server plugin endpoints for proper type inference.
         * This enables Better Auth to automatically generate typed methods
         * for all /farcaster/* endpoints defined in the server plugin.
         */
        $InferServerPlugin: {} as ReturnType<typeof farcasterAuth>,
    } satisfies BetterAuthClientPlugin;
};

// Note: Types are now automatically inferred by Better Auth via $InferServerPlugin.
// The client methods will be available under authClient.farcaster.* with proper TypeScript types.