import type { User as BetterAuthUser, Session } from "better-auth";

// Extended user type with Farcaster FID
export type FarcasterUser = BetterAuthUser & { fid?: number | null };

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
