// React hooks for Farcaster Core (SIWF) authentication
export { useFarcasterSIWF } from "./useFarcasterSIWF";
export type {
    UseFarcasterSIWFOptions,
    UseFarcasterSIWFReturn,
    SessionData,
    SIWFChannelStatus,
    BetterAuthClientWithFarcasterCore,
} from "./useFarcasterSIWF";

// Pre-styled button component
export { FarcasterCoreButton } from "./FarcasterCoreButton";
export type { FarcasterCoreButtonProps } from "./FarcasterCoreButton";

export { useFarcasterCoreLink } from "./useFarcasterCoreLink";
export type {
    UseFarcasterCoreLinkOptions,
    UseFarcasterCoreLinkReturn,
    BetterAuthClientForCoreLink,
} from "./useFarcasterCoreLink";

// React context and provider
export {
    FarcasterCoreProvider,
    useFarcasterCore,
    useFarcasterCoreSIWF,
    useFarcasterCoreLinking,
} from "./FarcasterCoreContext";
export type {
    FarcasterCoreContextValue,
    FarcasterCoreProviderOptions,
    FarcasterCoreProviderProps,
} from "./FarcasterCoreContext";

// Error types
export { FarcasterCoreAuthError } from "./errors";
export type { FarcasterCoreAuthErrorCode } from "./errors";

// Re-export shared types
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterLinkResponse,
    FarcasterProfileResponse,
} from "../../types";

export type {
    SIWFChannelResponse,
    SIWFVerifyParams,
} from "../types";
