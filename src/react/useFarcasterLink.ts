import { useState, useCallback } from "react";
import type { FarcasterLinkResponse, FarcasterUser } from "../types";

/**
 * Function type for getting a Farcaster Quick Auth token
 * This should be provided by the developer using their preferred Farcaster SDK
 */
export type GetFarcasterTokenFn = () => Promise<string>;

/**
 * Options for the useFarcasterLink hook
 */
export interface UseFarcasterLinkOptions {
    /**
     * The Better Auth client instance with Farcaster plugin
     * Must have the farcasterAuthClient plugin configured
     */
    authClient: {
        link: (data: { token: string }) => Promise<{
            data: FarcasterLinkResponse | null;
            error: { message: string; status: number } | null;
        }>;
        unlink: () => Promise<{
            data: FarcasterLinkResponse | null;
            error: { message: string; status: number } | null;
        }>;
    };
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
    onError?: (error: Error) => void;
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
    error: Error | null;
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
 * React hook for linking/unlinking Farcaster accounts with Better Auth
 * 
 * This hook provides a simple interface to link or unlink Farcaster accounts.
 * You need to provide a `getToken` function that obtains the Farcaster Quick Auth token.
 * 
 * @example Using with @farcaster/frame-sdk:
 * ```tsx
 * import { useFarcasterLink } from "better-auth-farcaster-plugin/react";
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
    const [error, setError] = useState<Error | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);

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
            const token = await getToken();

            if (!token) {
                throw new Error("Failed to get Farcaster authentication token");
            }

            // Send the token to the Better Auth backend
            const response = await authClient.link({ token });

            if (response.error) {
                throw new Error(response.error.message || "Linking failed");
            }

            if (!response.data) {
                throw new Error("No data received from server");
            }

            setUser(response.data.user);
            onLinkSuccess?.(response.data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
        } finally {
            setIsLinking(false);
        }
    }, [authClient, getToken, onLinkSuccess, onError]);

    const unlink = useCallback(async () => {
        setIsUnlinking(true);
        setError(null);

        try {
            const response = await authClient.unlink();

            if (response.error) {
                throw new Error(response.error.message || "Unlinking failed");
            }

            if (!response.data) {
                throw new Error("No data received from server");
            }

            setUser(response.data.user);
            onUnlinkSuccess?.(response.data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
        } finally {
            setIsUnlinking(false);
        }
    }, [authClient, onUnlinkSuccess, onError]);

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
