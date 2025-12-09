import type { User as BetterAuthUser, Session } from "better-auth";

// Extended user type with Farcaster FID
export type FarcasterUser = BetterAuthUser & { fid?: number | null };

// Plugin options
export interface FarcasterPluginOptions {
    /**
     * The domain of your application (e.g., "myapp.com" or "https://myapp.com")
     * Used to verify the JWT token's audience
     */
    domain: string;
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

// Response types
export interface FarcasterSignInResponse {
    user: FarcasterUser;
    session: Session;
}

export interface FarcasterProfileResponse {
    fid: number;
    user: FarcasterUser;
}

export interface FarcasterLinkResponse {
    success: boolean;
    user: FarcasterUser;
}
