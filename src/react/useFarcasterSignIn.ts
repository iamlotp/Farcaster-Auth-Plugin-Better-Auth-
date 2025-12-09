import { useState, useCallback, useEffect, useRef } from "react";
import type { Session } from "better-auth";
import type { FarcasterSignInResponse, FarcasterUser } from "../types";
import { FarcasterAuthError } from "./errors";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signOut: () => Promise<any>;
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
    onError?: (error: FarcasterAuthError) => void;
    /**
     * Callback fired when sign-out completes
     */
    onSignOut?: () => void;
    /**
     * Callback fired when session expires or becomes invalid
     * This is detected when refreshSession finds no valid session
     * after previously being authenticated
     */
    onSessionExpired?: () => void;
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
     * Sign out the current user and clear local state
     * This calls authClient.signOut() and resets the hook state
     */
    signOut: () => Promise<void>;
    /**
     * Whether the sign-in process is currently in progress
     */
    isLoading: boolean;
    /**
     * Whether the sign-out process is currently in progress
     */
    isSigningOut: boolean;
    /**
     * Whether the session check is in progress (on initial mount)
     */
    isCheckingSession: boolean;
    /**
     * Error that occurred during sign-in or session check, if any
     * This is a FarcasterAuthError with a code property for programmatic handling
     */
    error: FarcasterAuthError | null;
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
     * If session has expired, will trigger onSessionExpired callback
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
 *     signOut,
 *     isLoading,
 *     isSigningOut,
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
 *     onSignOut: () => {
 *       console.log("User signed out");
 *     },
 *     onSessionExpired: () => {
 *       console.log("Session expired!");
 *     },
 *     onError: (error) => {
 *       console.error("Sign-in failed:", error.code, error.message);
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
 *         <button onClick={signOut} disabled={isSigningOut}>
 *           {isSigningOut ? "Signing out..." : "Sign Out"}
 *         </button>
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
        onError,
        onSignOut,
        onSessionExpired
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(autoCheckSession);
    const [error, setError] = useState<FarcasterAuthError | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);

    // Use refs to track state and store stable references
    const hasCheckedSession = useRef(false);
    const wasAuthenticated = useRef(false);
    const authClientRef = useRef(authClient);
    const onSessionFoundRef = useRef(onSessionFound);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onSignOutRef = useRef(onSignOut);
    const onSessionExpiredRef = useRef(onSessionExpired);
    const getTokenRef = useRef(getToken);

    // Keep refs up to date
    authClientRef.current = authClient;
    onSessionFoundRef.current = onSessionFound;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onSignOutRef.current = onSignOut;
    onSessionExpiredRef.current = onSessionExpired;
    getTokenRef.current = getToken;

    // Track authentication state for session expiration detection
    useEffect(() => {
        wasAuthenticated.current = user !== null && session !== null;
    }, [user, session]);

    const reset = useCallback(() => {
        setIsLoading(false);
        setIsSigningOut(false);
        setIsCheckingSession(false);
        setError(null);
        setUser(null);
        setSession(null);
        hasCheckedSession.current = false;
        wasAuthenticated.current = false;
    }, []);

    /**
     * Fetch and restore session from the server/cookies
     */
    const refreshSession = useCallback(async () => {
        setIsCheckingSession(true);
        setError(null);

        try {
            const response = await authClientRef.current.getSession();

            if (response.error) {
                // Session check failed - check if session expired
                if (wasAuthenticated.current) {
                    onSessionExpiredRef.current?.();
                }
                setUser(null);
                setSession(null);
                return;
            }

            if (response.data) {
                setUser(response.data.user);
                setSession(response.data.session);
                onSessionFoundRef.current?.(response.data);
            } else {
                // No session data - check if session expired
                if (wasAuthenticated.current) {
                    onSessionExpiredRef.current?.();
                }
                setUser(null);
                setSession(null);
            }
        } catch (err) {
            // Session check failed - check if session expired
            if (wasAuthenticated.current) {
                onSessionExpiredRef.current?.();
            }
            setUser(null);
            setSession(null);
        } finally {
            setIsCheckingSession(false);
        }
    }, []); // No dependencies - uses refs

    /**
     * Check for existing session on mount (only once)
     */
    useEffect(() => {
        if (autoCheckSession && !hasCheckedSession.current) {
            hasCheckedSession.current = true;
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
            const sessionResponse = await authClientRef.current.getSession();

            if (sessionResponse.data && sessionResponse.data.session) {
                // Valid session found, use it
                setUser(sessionResponse.data.user);
                setSession(sessionResponse.data.session);
                onSessionFoundRef.current?.(sessionResponse.data);
                return;
            }

            // No valid session, proceed with Farcaster sign-in
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

            // Send the token to the Better Auth backend via the farcaster plugin
            const response = await authClientRef.current.farcaster.signIn({ token });

            if (response.error) {
                const errorMessage = response.error.message || "Authentication failed";
                // Detect specific error types
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
            setSession(response.data.session);
            onSuccessRef.current?.(response.data);
        } catch (err) {
            const error = FarcasterAuthError.from(err);
            setError(error);
            onErrorRef.current?.(error);
        } finally {
            setIsLoading(false);
        }
    }, [user, session]); // Only depends on user/session state

    /**
     * Sign out and clear local state
     */
    const signOut = useCallback(async () => {
        setIsSigningOut(true);
        try {
            await authClientRef.current.signOut();
        } catch (err) {
            // Ignore sign out errors, still clear local state
        } finally {
            setUser(null);
            setSession(null);
            setError(null);
            hasCheckedSession.current = false;
            wasAuthenticated.current = false;
            setIsSigningOut(false);
            onSignOutRef.current?.();
        }
    }, []);

    const isAuthenticated = user !== null && session !== null;

    return {
        signIn,
        signOut,
        isLoading,
        isSigningOut,
        isCheckingSession,
        error,
        user,
        session,
        isAuthenticated,
        reset,
        refreshSession,
    };
}
