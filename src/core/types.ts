/**
 * Core SIWF (Sign In With Farcaster) types for OAuth-like authentication
 * Uses @farcaster/auth-client for channel-based authentication flow
 */

/**
 * Plugin options for Farcaster Core authentication
 * Uses channel-based SIWF flow for regular web pages (OAuth-like)
 */
export interface FarcasterCorePluginOptions {
    /**
     * The domain of your application (e.g., "myapp.com" or "https://myapp.com")
     * Used for SIWE message verification
     */
    domain: string;
    /**
     * The SIWE URI for your application login page
     * This appears in the SIWE message shown to users
     */
    siweUri: string;
    /**
     * Relay server URL for Farcaster Auth
     * @default 'https://relay.farcaster.xyz'
     */
    relay?: string;
    /**
     * Optional function to resolve additional user data from Farcaster
     * @param fid - The Farcaster ID
     * @returns Additional user data to store
     */
    resolveUserData?: (fid: number) => Promise<{
        name?: string;
        email?: string;
        image?: string;
    }>;
    /**
     * Cookie configuration options
     */
    cookieOptions?: {
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        httpOnly?: boolean;
        path?: string;
    };
}

/**
 * Response from creating a SIWF channel
 */
export interface SIWFChannelResponse {
    /**
     * Channel token for tracking the sign-in request
     */
    channelToken: string;
    /**
     * URL to present to the user (QR code or deeplink)
     */
    url: string;
    /**
     * Nonce used in the SIWE message
     */
    nonce: string;
}

/**
 * Parameters for verifying a SIWF signature
 */
export interface SIWFVerifyParams {
    /**
     * The channel token from createChannel
     */
    channelToken: string;
    /**
     * The SIWE message that was signed
     */
    message: string;
    /**
     * The signature from the user's wallet
     */
    signature: `0x${string}`;
    /**
     * The user's Farcaster ID
     */
    fid: number;
    /**
     * The user's Farcaster username
     */
    username?: string;
    /**
     * The user's display name
     */
    displayName?: string;
    /**
     * The user's profile picture URL
     */
    pfpUrl?: string;
    /**
     * The user's bio
     */
    bio?: string;
}

/**
 * Response from verifying a SIWF signature
 */
export interface SIWFVerifyResponse {
    /**
     * Whether the verification was successful
     */
    success: boolean;
    /**
     * The authenticated user
     */
    user: import('../types').FarcasterUser;
    /**
     * The session
     */
    session: import('better-auth').Session;
}
