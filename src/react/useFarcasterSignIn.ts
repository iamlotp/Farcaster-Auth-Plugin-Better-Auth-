import { useState, useCallback } from "react";
import type { FarcasterSignInResponse, FarcasterUser } from "../types";

/**
 * Function type for getting a Farcaster Quick Auth token
 * This should be provided by the developer using their preferred Farcaster SDK
 * (e.g., @farcaster/auth-kit, @farcaster/frame-sdk, or custom implementation)
 */
export type GetFarcasterTokenFn = () => Promise<string>;

/**
 * Options for the useFarcasterSignIn hook
 */
export interface UseFarcasterSignInOptions {
    /**
     * The Better Auth client instance with Farcaster plugin
     * Must have the farcasterAuthClient plugin configured
     */
    authClient: {
        signIn: (data: { token: string }) => Promise<{
            data: FarcasterSignInResponse | null;
            error: { message: string; status: number } | null;
        }>;
    };
    /**
     * Function to get the Farcaster Quick Auth token
     * This is typically obtained from @farcaster/auth-kit or @farcaster/frame-sdk
     * 
     * @example Using @farcaster/auth-kit:
     * ```ts
     * import { useSignIn } from "@farcaster/auth-kit";
     * 
     * const { signIn: farcasterSignIn, message, signature, nonce } = useSignIn({
     *   onSuccess: ({ message, signature, nonce }) => {
     *     // Handle success
     *   },
     * });
     * ```
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
     * Callback fired when sign-in succeeds
     */
    onSuccess?: (response: FarcasterSignInResponse) => void;
    /**
     * Callback fired when sign-in fails
     */
    onError?: (error: Error) => void;
}

/**
 * Return type for the useFarcasterSignIn hook
 */
export interface UseFarcasterSignInReturn {
    /**
     * Initiates the Farcaster sign-in flow
     * Calls the getToken function and sends the token to Better Auth
     */
    signIn: () => Promise<void>;
    /**
     * Whether the sign-in process is currently in progress
     */
    isLoading: boolean;
    /**
     * Error that occurred during sign-in, if any
     */
    error: Error | null;
    /**
     * The authenticated user data after successful sign-in
     */
    user: FarcasterUser | null;
    /**
     * Whether the user is currently authenticated
     */
    isAuthenticated: boolean;
    /**
     * Resets the hook state (clears user, error, etc.)
     */
    reset: () => void;
}

/**
 * React hook for Farcaster sign-in with Better Auth
 * 
 * This hook provides a simple interface to authenticate users via Farcaster.
 * You need to provide a `getToken` function that obtains the Farcaster Quick Auth token.
 * 
 * @example Using with @farcaster/frame-sdk:
 * ```tsx
 * import { useFarcasterSignIn } from "better-auth-farcaster-plugin/react";
 * import { authClient } from "./lib/auth-client";
 * import sdk from "@farcaster/frame-sdk";
 * 
 * function SignInButton() {
 *   const { signIn, isLoading, error, user, isAuthenticated } = useFarcasterSignIn({
 *     authClient,
 *     getToken: async () => {
 *       const result = await sdk.quickAuth.getToken();
 *       return result.token;
 *     },
 *     onSuccess: (response) => {
 *       console.log("Signed in!", response.user);
 *     },
 *     onError: (error) => {
 *       console.error("Sign-in failed:", error);
 *     },
 *   });
 * 
 *   if (isAuthenticated) {
 *     return <div>Welcome, {user?.name}!</div>;
 *   }
 * 
 *   return (
 *     <button onClick={signIn} disabled={isLoading}>
 *       {isLoading ? "Signing in..." : "Sign in with Farcaster"}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @example Using with a custom token provider:
 * ```tsx
 * import { useFarcasterSignIn } from "better-auth-farcaster-plugin/react";
 * import { authClient } from "./lib/auth-client";
 * 
 * function SignInWithToken({ tokenFromSomewhere }: { tokenFromSomewhere: string }) {
 *   const { signIn, isLoading } = useFarcasterSignIn({
 *     authClient,
 *     getToken: async () => tokenFromSomewhere,
 *   });
 * 
 *   return (
 *     <button onClick={signIn} disabled={isLoading}>
 *       Sign in
 *     </button>
 *   );
 * }
 * ```
 */
export function useFarcasterSignIn(
    options: UseFarcasterSignInOptions
): UseFarcasterSignInReturn {
    const { authClient, getToken, onSuccess, onError } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setUser(null);
    }, []);

    const signIn = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Get the Farcaster Quick Auth token from the provided function
            const token = await getToken();

            if (!token) {
                throw new Error("Failed to get Farcaster authentication token");
            }

            // Send the token to the Better Auth backend
            const response = await authClient.signIn({ token });

            if (response.error) {
                throw new Error(response.error.message || "Authentication failed");
            }

            if (!response.data) {
                throw new Error("No data received from server");
            }

            setUser(response.data.user);
            onSuccess?.(response.data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
        } finally {
            setIsLoading(false);
        }
    }, [authClient, getToken, onSuccess, onError]);

    const isAuthenticated = user !== null;

    return {
        signIn,
        isLoading,
        error,
        user,
        isAuthenticated,
        reset,
    };
}
