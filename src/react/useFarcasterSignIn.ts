import { useState, useCallback, useEffect } from "react";
import type { Session } from "better-auth";
import type { FarcasterSignInResponse, FarcasterUser } from "../types";

/**
 * Function type for getting a Farcaster Quick Auth token
 * This should be provided by the developer using their preferred Farcaster SDK
 * (e.g., @farcaster/auth-kit, @farcaster/frame-sdk, or custom implementation)
 */
export type GetFarcasterTokenFn = () => Promise<string>;

/**
 * Session data structure returned by Better Auth
 */
export interface SessionData {
    user: FarcasterUser;
    session: Session;
}

/**
 * Minimal type for Better Auth client with Farcaster plugin
 * Uses permissive types to be compatible with the actual Better Auth client
 * which returns union types (Data | Error)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BetterAuthClientWithFarcaster {
    farcaster: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signIn: (data: { token: string }) => Promise<any>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSession: () => Promise<any>;
}

/**
 * Options for the useFarcasterSignIn hook
 */
export interface UseFarcasterSignInOptions {
    /**
     * The Better Auth client instance with Farcaster plugin configured.
     * This should be the full auth client created with `createAuthClient` 
     * and the `farcasterAuthClient` plugin.
     * 
     * @example
     * ```ts
     * import { createAuthClient } from "better-auth/react";
     * import { farcasterAuthClient } from "better-auth-farcaster-plugin/client";
     * 
     * export const authClient = createAuthClient({
     *   plugins: [farcasterAuthClient()],
     * });
     * ```
     */
    authClient: BetterAuthClientWithFarcaster;
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
     * Whether to automatically check for existing session on mount
     * @default true
     */
    autoCheckSession?: boolean;
    /**
     * Callback fired when sign-in succeeds
     */
    onSuccess?: (response: FarcasterSignInResponse) => void;
    /**
     * Callback fired when an existing session is found
     */
    onSessionFound?: (sessionData: SessionData) => void;
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
     * If a valid session exists, it will use that instead of signing in again
     */
    signIn: () => Promise<void>;
    /**
     * Whether the sign-in process is currently in progress
     */
    isLoading: boolean;
    /**
     * Whether the session check is in progress (on initial mount)
     */
    isCheckingSession: boolean;
    /**
     * Error that occurred during sign-in or session check, if any
     */
    error: Error | null;
    /**
     * The authenticated user data after successful sign-in or session restoration
     */
    user: FarcasterUser | null;
    /**
     * The current session data
     */
    session: Session | null;
    /**
     * Whether the user is currently authenticated
     */
    isAuthenticated: boolean;
    /**
     * Resets the hook state (clears user, session, error, etc.)
     */
    reset: () => void;
    /**
     * Manually refresh the session from the server
     */
    refreshSession: () => Promise<void>;
}

/**
 * React hook for Farcaster sign-in with Better Auth
 * 
 * This hook provides a simple interface to authenticate users via Farcaster.
 * It automatically checks for existing sessions on mount and restores user state.
 * The sign-in flow only triggers if no valid session exists.
 * 
 * @example Using with @farcaster/frame-sdk:
 * ```tsx
 * import { useFarcasterSignIn } from "better-auth-farcaster-plugin/react";
 * import { authClient } from "./lib/auth-client";
 * import sdk from "@farcaster/frame-sdk";
 * 
 * function SignInButton() {
 *   const { 
 *     signIn, 
 *     isLoading, 
 *     isCheckingSession,
 *     error, 
 *     user, 
 *     session,
 *     isAuthenticated 
 *   } = useFarcasterSignIn({
 *     authClient,
 *     getToken: async () => {
 *       const result = await sdk.quickAuth.getToken();
 *       return result.token;
 *     },
 *     onSuccess: (response) => {
 *       console.log("Signed in!", response.user);
 *     },
 *     onSessionFound: (data) => {
 *       console.log("Existing session found!", data.user);
 *     },
 *     onError: (error) => {
 *       console.error("Sign-in failed:", error);
 *     },
 *   });
 * 
 *   if (isCheckingSession) {
 *     return <div>Checking session...</div>;
 *   }
 * 
 *   if (isAuthenticated) {
 *     return (
 *       <div>
 *         <p>Welcome, {user?.name}!</p>
 *         <p>Session expires: {session?.expiresAt}</p>
 *       </div>
 *     );
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
 * @example Disabling auto session check:
 * ```tsx
 * const { signIn, isLoading } = useFarcasterSignIn({
 *   authClient,
 *   getToken: async () => tokenFromSomewhere,
 *   autoCheckSession: false, // Disable automatic session check
 * });
 * ```
 */
export function useFarcasterSignIn(
    options: UseFarcasterSignInOptions
): UseFarcasterSignInReturn {
    const {
        authClient,
        getToken,
        autoCheckSession = true,
        onSuccess,
        onSessionFound,
        onError
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(autoCheckSession);
    const [error, setError] = useState<Error | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);

    const reset = useCallback(() => {
        setIsLoading(false);
        setIsCheckingSession(false);
        setError(null);
        setUser(null);
        setSession(null);
    }, []);

    /**
     * Fetch and restore session from the server/cookies
     */
    const refreshSession = useCallback(async () => {
        setIsCheckingSession(true);
        setError(null);

        try {
            const response = await authClient.getSession();

            if (response.error) {
                // Session check failed, but this is not necessarily an error
                // It might just mean the user is not logged in
                setUser(null);
                setSession(null);
                return;
            }

            if (response.data) {
                setUser(response.data.user);
                setSession(response.data.session);
                onSessionFound?.(response.data);
            } else {
                setUser(null);
                setSession(null);
            }
        } catch (err) {
            // Session check failed - user is likely not logged in
            // We don't set error here as this is expected behavior
            setUser(null);
            setSession(null);
        } finally {
            setIsCheckingSession(false);
        }
    }, [authClient, onSessionFound]);

    /**
     * Check for existing session on mount
     */
    useEffect(() => {
        if (autoCheckSession) {
            refreshSession();
        }
    }, [autoCheckSession, refreshSession]);

    /**
     * Sign in with Farcaster
     * Only performs sign-in if no valid session exists
     */
    const signIn = useCallback(async () => {
        // If user is already authenticated, no need to sign in again
        if (user && session) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // First, check if there's a valid session we might have missed
            const sessionResponse = await authClient.getSession();

            if (sessionResponse.data && sessionResponse.data.session) {
                // Valid session found, use it
                setUser(sessionResponse.data.user);
                setSession(sessionResponse.data.session);
                onSessionFound?.(sessionResponse.data);
                return;
            }

            // No valid session, proceed with Farcaster sign-in
            const token = await getToken();

            if (!token) {
                throw new Error("Failed to get Farcaster authentication token");
            }

            // Send the token to the Better Auth backend via the farcaster plugin
            const response = await authClient.farcaster.signIn({ token });

            if (response.error) {
                throw new Error(response.error.message || "Authentication failed");
            }

            if (!response.data) {
                throw new Error("No data received from server");
            }

            setUser(response.data.user);
            setSession(response.data.session);
            onSuccess?.(response.data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
        } finally {
            setIsLoading(false);
        }
    }, [authClient, getToken, user, session, onSuccess, onSessionFound, onError]);

    const isAuthenticated = user !== null && session !== null;

    return {
        signIn,
        isLoading,
        isCheckingSession,
        error,
        user,
        session,
        isAuthenticated,
        reset,
        refreshSession,
    };
}

