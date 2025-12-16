// React hooks for Farcaster authentication (Miniapp context)
export { useFarcasterSignIn } from "./useFarcasterSignIn";

// Pre-styled button component
export { FarcasterButton } from "./FarcasterButton";
export type { FarcasterButtonProps } from "./FarcasterButton";

// React context and provider for Farcaster authentication
export {
    FarcasterProvider,
    useFarcaster,
    useFarcasterAuth,
    useFarcasterLinking,
} from "./FarcasterContext";
export type {
    FarcasterContextValue,
    FarcasterProviderOptions,
    FarcasterProviderProps,
} from "./FarcasterContext";
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
    BetterAuthClientForLink,
} from "./useFarcasterLink";

// Error types
export { FarcasterAuthError } from "./errors";
export type { FarcasterAuthErrorCode } from "./errors";

// Re-export types that consumers might need
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterLinkResponse,
    FarcasterProfileResponse,
} from "../../types";
