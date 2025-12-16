import { useState, useCallback, useRef } from "react";
import type { FarcasterLinkResponse, FarcasterUser } from "../../types";
import { FarcasterAuthError } from "./errors";

/**
 * Function type for getting a Farcaster Quick Auth token
 * This should be provided by the developer using their preferred Farcaster SDK
 */
export type GetFarcasterTokenFn = () => Promise<string>;

/**
 * Minimal type for Better Auth client with Farcaster plugin (link operations)
 * Uses permissive types to be compatible with the actual Better Auth client
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BetterAuthClientForLink {
    farcasterMiniapp: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        link: (data: { token: string }) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unlink: () => Promise<any>;
    };
}

/**
 * Options for the useFarcasterLink hook
 */
export interface UseFarcasterLinkOptions {
    /**
     * The Better Auth client instance with Farcaster plugin configured.
     * This should be the full auth client created with `createAuthClient` 
     * and the `farcasterMiniappClient` plugin.
     * 
     * @example
     * ```ts
     * import { createAuthClient } from "better-auth/react";
     * import { farcasterMiniappClient } from "better-auth-farcaster-plugin/miniapp/client";
     * 
     * export const authClient = createAuthClient({
     *   plugins: [farcasterMiniappClient()],
     * });
     * ```
     */
    authClient: BetterAuthClientForLink;
    /**
     * Function to get the Farcaster Quick Auth token for linking
     * This is typically obtained from @farcaster/auth-kit or @farcaster/frame-sdk
     * 
     * @example Using @farcaster/frame-sdk:
     * ```ts
     * import sdk from "@farcaster/frame-sdk";
     * 
     * const getToken = async () => {
     *   const result = await sdk.quickAuth.getToken();
     *   return result.token;
     * };
     * ```
     */
    getToken: GetFarcasterTokenFn;
    /**
     * Callback fired when linking succeeds
     */
    onLinkSuccess?: (response: FarcasterLinkResponse) => void;
    /**
     * Callback fired when unlinking succeeds
     */
    onUnlinkSuccess?: (response: FarcasterLinkResponse) => void;
    /**
     * Callback fired when an operation fails
     */
    onError?: (error: FarcasterAuthError) => void;
}

/**
 * Return type for the useFarcasterLink hook
 */
export interface UseFarcasterLinkReturn {
    /**
     * Links the current authenticated account to a Farcaster FID
     * Calls the getToken function and sends the token to Better Auth
     */
    link: () => Promise<void>;
    /**
     * Unlinks Farcaster from the current authenticated account
     */
    unlink: () => Promise<void>;
    /**
     * Whether a link/unlink operation is currently in progress
     */
    isLoading: boolean;
    /**
     * Whether the link operation is in progress
     */
    isLinking: boolean;
    /**
     * Whether the unlink operation is in progress
     */
    isUnlinking: boolean;
    /**
     * Error that occurred during the last operation, if any
     */
    error: FarcasterAuthError | null;
    /**
     * The updated user data after successful link/unlink
     */
    user: FarcasterUser | null;
    /**
     * Resets the hook state (clears errors, etc.)
     */
    reset: () => void;
}

/**
 * React hook for linking/unlinking Farcaster accounts with Better Auth (Miniapp context)
 * 
 * This hook provides a simple interface to link or unlink Farcaster accounts.
 * You need to provide a `getToken` function that obtains the Farcaster Quick Auth token.
 * 
 * @example Using with @farcaster/frame-sdk:
 * ```tsx
 * import { useFarcasterLink } from "better-auth-farcaster-plugin/miniapp/react";
 * import { authClient } from "./lib/auth-client";
 * import sdk from "@farcaster/frame-sdk";
 * 
 * function LinkFarcasterButton({ currentUser }) {
 *   const { link, unlink, isLoading, error } = useFarcasterLink({
 *     authClient,
 *     getToken: async () => {
 *       const result = await sdk.quickAuth.getToken();
 *       return result.token;
 *     },
 *     onLinkSuccess: (response) => {
 *       console.log("Linked!", response.user.fid);
 *     },
 *     onUnlinkSuccess: () => {
 *       console.log("Unlinked!");
 *     },
 *     onError: (error) => {
 *       console.error("Error:", error.code, error.message);
 *     },
 *   });
 * 
 *   if (currentUser.fid) {
 *     return (
 *       <button onClick={unlink} disabled={isLoading}>
 *         {isLoading ? "Unlinking..." : "Unlink Farcaster"}
 *       </button>
 *     );
 *   }
 * 
 *   return (
 *     <button onClick={link} disabled={isLoading}>
 *       {isLoading ? "Linking..." : "Link Farcaster Account"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useFarcasterLink(
    options: UseFarcasterLinkOptions
): UseFarcasterLinkReturn {
    const { authClient, getToken, onLinkSuccess, onUnlinkSuccess, onError } = options;

    const [isLinking, setIsLinking] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [error, setError] = useState<FarcasterAuthError | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);

    // Use refs to store stable references to callbacks and client
    const authClientRef = useRef(authClient);
    const getTokenRef = useRef(getToken);
    const onLinkSuccessRef = useRef(onLinkSuccess);
    const onUnlinkSuccessRef = useRef(onUnlinkSuccess);
    const onErrorRef = useRef(onError);

    // Keep refs up to date
    authClientRef.current = authClient;
    getTokenRef.current = getToken;
    onLinkSuccessRef.current = onLinkSuccess;
    onUnlinkSuccessRef.current = onUnlinkSuccess;
    onErrorRef.current = onError;

    const reset = useCallback(() => {
        setIsLinking(false);
        setIsUnlinking(false);
        setError(null);
        setUser(null);
    }, []);

    const link = useCallback(async () => {
        setIsLinking(true);
        setError(null);

        try {
            // Get the Farcaster Quick Auth token from the provided function
            let token: string;
            try {
                token = await getTokenRef.current();
            } catch (err) {
                throw new FarcasterAuthError(
                    "Failed to get Farcaster authentication token",
                    'TOKEN_FETCH_FAILED',
                    err instanceof Error ? err : undefined
                );
            }

            if (!token) {
                throw new FarcasterAuthError(
                    "No token returned from getToken function",
                    'TOKEN_FETCH_FAILED'
                );
            }

            // Send the token to the Better Auth backend
            const response = await authClientRef.current.farcasterMiniapp.link({ token });

            if (response.error) {
                const errorMessage = response.error.message || "Linking failed";
                let errorCode: FarcasterAuthError['code'] = 'UNKNOWN';
                if (errorMessage.includes('rate limit') || response.error.status === 429) {
                    errorCode = 'RATE_LIMITED';
                } else if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
                    errorCode = 'INVALID_TOKEN';
                }
                throw new FarcasterAuthError(errorMessage, errorCode);
            }

            if (!response.data) {
                throw new FarcasterAuthError("No data received from server", 'UNKNOWN');
            }

            setUser(response.data.user);
            onLinkSuccessRef.current?.(response.data);
        } catch (err) {
            const error = FarcasterAuthError.from(err);
            setError(error);
            onErrorRef.current?.(error);
        } finally {
            setIsLinking(false);
        }
    }, []); // No dependencies - uses refs

    const unlink = useCallback(async () => {
        setIsUnlinking(true);
        setError(null);

        try {
            const response = await authClientRef.current.farcasterMiniapp.unlink();

            if (response.error) {
                const errorMessage = response.error.message || "Unlinking failed";
                throw new FarcasterAuthError(errorMessage, 'UNKNOWN');
            }

            if (!response.data) {
                throw new FarcasterAuthError("No data received from server", 'UNKNOWN');
            }

            setUser(response.data.user);
            onUnlinkSuccessRef.current?.(response.data);
        } catch (err) {
            const error = FarcasterAuthError.from(err);
            setError(error);
            onErrorRef.current?.(error);
        } finally {
            setIsUnlinking(false);
        }
    }, []); // No dependencies - uses refs

    const isLoading = isLinking || isUnlinking;

    return {
        link,
        unlink,
        isLoading,
        isLinking,
        isUnlinking,
        error,
        user,
        reset,
    };
}
