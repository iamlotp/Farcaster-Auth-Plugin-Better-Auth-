// React hooks for Farcaster authentication
export { useFarcasterSignIn } from "./useFarcasterSignIn";
export type {
    UseFarcasterSignInOptions,
    UseFarcasterSignInReturn,
    GetFarcasterTokenFn,
    SessionData,
    BetterAuthClientWithFarcaster,
} from "./useFarcasterSignIn";

export { useFarcasterLink } from "./useFarcasterLink";
export type {
    UseFarcasterLinkOptions,
    UseFarcasterLinkReturn,
} from "./useFarcasterLink";

// Re-export types that consumers might need
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterLinkResponse,
    FarcasterProfileResponse,
} from "../types";
