import { useState, useCallback, useEffect, useRef } from "react";
import type { Session } from "better-auth";
import type { FarcasterSignInResponse, FarcasterUser } from "../../types";
import type { SIWFChannelResponse } from "../types";
import { FarcasterCoreAuthError } from "./errors";

/**
 * Session data structure returned by Better Auth
 */
export interface SessionData {
    user: FarcasterUser;
    session: Session;
}

/**
 * Status from polling the SIWF channel
 */
export interface SIWFChannelStatus {
    state: 'pending' | 'completed';
    nonce: string;
    message?: string;
    signature?: `0x${string}`;
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    bio?: string;
}

/**
 * Minimal type for Better Auth client with Farcaster Core plugin
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BetterAuthClientWithFarcasterCore {
    farcaster: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createChannel: (data?: any) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channelStatus: (data: { channelToken: string }) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        verifySignature: (data: any) => Promise<any>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSession: () => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signOut: () => Promise<any>;
}

/**
 * Options for the useFarcasterSIWF hook
 */
export interface UseFarcasterSIWFOptions {
    /**
     * The Better Auth client instance with Farcaster Core plugin configured.
     */
    authClient: BetterAuthClientWithFarcasterCore;
    /**
     * Whether to automatically check for existing session on mount
     * @default true
     */
    autoCheckSession?: boolean;
    /**
     * Polling interval for channel status in milliseconds
     * @default 2000
     */
    pollInterval?: number;
    /**
     * Maximum time to poll in milliseconds before timeout
     * @default 300000 (5 minutes)
     */
    pollTimeout?: number;
    /**
     * Callback fired when channel is created
     */
    onChannelCreated?: (data: SIWFChannelResponse) => void;
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
    onError?: (error: FarcasterCoreAuthError) => void;
    /**
     * Callback fired when sign-out completes
     */
    onSignOut?: () => void;
    /**
     * Callback fired when session expires
     */
    onSessionExpired?: () => void;
}

/**
 * Return type for the useFarcasterSIWF hook
 */
export interface UseFarcasterSIWFReturn {
    /**
     * Create a new SIWF channel and start polling
     */
    createChannel: () => Promise<SIWFChannelResponse | null>;
    /**
     * Cancel the current sign-in attempt (stops polling)
     */
    cancel: () => void;
    /**
     * Sign out the current user
     */
    signOut: () => Promise<void>;
    /**
     * The channel URL for QR code/deeplink (null when not active)
     */
    channelUrl: string | null;
    /**
     * The channel token (null when not active)
     */
    channelToken: string | null;
    /**
     * Whether channel creation is in progress
     */
    isCreatingChannel: boolean;
    /**
     * Whether polling for completion is in progress
     */
    isPolling: boolean;
    /**
     * Whether verification is in progress
     */
    isVerifying: boolean;
    /**
     * Combined loading state
     */
    isLoading: boolean;
    /**
     * Whether sign-out is in progress
     */
    isSigningOut: boolean;
    /**
     * Whether session check is in progress
     */
    isCheckingSession: boolean;
    /**
     * Error from the last attempt
     */
    error: FarcasterCoreAuthError | null;
    /**
     * The authenticated user
     */
    user: FarcasterUser | null;
    /**
     * The current session
     */
    session: Session | null;
    /**
     * Whether the user is authenticated
     */
    isAuthenticated: boolean;
    /**
     * Reset the hook state
     */
    reset: () => void;
    /**
     * Manually refresh the session
     */
    refreshSession: () => Promise<void>;
}

/**
 * React hook for Farcaster SIWF (Sign In With Farcaster) authentication
 * 
 * This hook handles the full channel-based OAuth-like flow:
 * 1. Creates a channel and returns a URL for QR code/deeplink
 * 2. Polls the channel for user approval
 * 3. Verifies the signature and creates a session
 * 
 * @example
 * ```tsx
 * import { useFarcasterSIWF } from "better-auth-farcaster-plugin/core/react";
 * import { authClient } from "./lib/auth-client";
 * import QRCode from "react-qr-code";
 * 
 * function SignInWithFarcaster() {
 *   const {
 *     createChannel,
 *     cancel,
 *     channelUrl,
 *     isLoading,
 *     isPolling,
 *     isAuthenticated,
 *     user,
 *     error,
 *   } = useFarcasterSIWF({
 *     authClient,
 *     onSuccess: (response) => {
 *       console.log("Signed in!", response.user);
 *     },
 *     onError: (error) => {
 *       console.error("Error:", error.code, error.message);
 *     },
 *   });
 * 
 *   if (isAuthenticated) {
 *     return <p>Welcome, {user?.name}!</p>;
 *   }
 * 
 *   if (channelUrl) {
 *     return (
 *       <div>
 *         <QRCode value={channelUrl} />
 *         <p>Scan with Farcaster app or <a href={channelUrl}>click here</a></p>
 *         {isPolling && <p>Waiting for approval...</p>}
 *         <button onClick={cancel}>Cancel</button>
 *       </div>
 *     );
 *   }
 * 
 *   return (
 *     <button onClick={createChannel} disabled={isLoading}>
 *       {isLoading ? "Loading..." : "Sign in with Farcaster"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useFarcasterSIWF(
    options: UseFarcasterSIWFOptions
): UseFarcasterSIWFReturn {
    const {
        authClient,
        autoCheckSession = true,
        pollInterval = 2000,
        pollTimeout = 300000,
        onChannelCreated,
        onSuccess,
        onSessionFound,
        onError,
        onSignOut,
        onSessionExpired,
    } = options;

    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(autoCheckSession);
    const [error, setError] = useState<FarcasterCoreAuthError | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [channelUrl, setChannelUrl] = useState<string | null>(null);
    const [channelToken, setChannelToken] = useState<string | null>(null);

    // Refs for stable references and polling control
    const hasCheckedSession = useRef(false);
    const wasAuthenticated = useRef(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const pollStartTime = useRef<number | null>(null);
    const cancelledRef = useRef(false);
    const authClientRef = useRef(authClient);
    const onChannelCreatedRef = useRef(onChannelCreated);
    const onSuccessRef = useRef(onSuccess);
    const onSessionFoundRef = useRef(onSessionFound);
    const onErrorRef = useRef(onError);
    const onSignOutRef = useRef(onSignOut);
    const onSessionExpiredRef = useRef(onSessionExpired);

    // Keep refs up to date
    authClientRef.current = authClient;
    onChannelCreatedRef.current = onChannelCreated;
    onSuccessRef.current = onSuccess;
    onSessionFoundRef.current = onSessionFound;
    onErrorRef.current = onError;
    onSignOutRef.current = onSignOut;
    onSessionExpiredRef.current = onSessionExpired;

    // Track authentication state
    useEffect(() => {
        wasAuthenticated.current = user !== null && session !== null;
    }, [user, session]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        pollStartTime.current = null;
        setIsPolling(false);
    }, []);

    const reset = useCallback(() => {
        stopPolling();
        cancelledRef.current = false;
        setIsCreatingChannel(false);
        setIsPolling(false);
        setIsVerifying(false);
        setIsSigningOut(false);
        setIsCheckingSession(false);
        setError(null);
        setUser(null);
        setSession(null);
        setChannelUrl(null);
        setChannelToken(null);
        hasCheckedSession.current = false;
        wasAuthenticated.current = false;
    }, [stopPolling]);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        stopPolling();
        setChannelUrl(null);
        setChannelToken(null);
        setError(null);
    }, [stopPolling]);

    const refreshSession = useCallback(async () => {
        setIsCheckingSession(true);
        setError(null);

        try {
            const response = await authClientRef.current.getSession();

            if (response.error) {
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
                if (wasAuthenticated.current) {
                    onSessionExpiredRef.current?.();
                }
                setUser(null);
                setSession(null);
            }
        } catch (err) {
            if (wasAuthenticated.current) {
                onSessionExpiredRef.current?.();
            }
            setUser(null);
            setSession(null);
        } finally {
            setIsCheckingSession(false);
        }
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        if (autoCheckSession && !hasCheckedSession.current) {
            hasCheckedSession.current = true;
            refreshSession();
        }
    }, [autoCheckSession, refreshSession]);

    const createChannel = useCallback(async (): Promise<SIWFChannelResponse | null> => {
        // If already authenticated, skip
        if (user && session) {
            return null;
        }

        setIsCreatingChannel(true);
        setError(null);
        cancelledRef.current = false;

        try {
            // First check for existing session
            const sessionResponse = await authClientRef.current.getSession();

            if (sessionResponse.data && sessionResponse.data.session) {
                setUser(sessionResponse.data.user);
                setSession(sessionResponse.data.session);
                onSessionFoundRef.current?.(sessionResponse.data);
                setIsCreatingChannel(false);
                return null;
            }

            // Create channel
            const channelResponse = await authClientRef.current.farcaster.createChannel({});

            if (channelResponse.error) {
                throw new FarcasterCoreAuthError(
                    channelResponse.error.message || "Failed to create channel",
                    'NETWORK_ERROR'
                );
            }

            if (!channelResponse.data) {
                throw new FarcasterCoreAuthError(
                    "No data received from server",
                    'NETWORK_ERROR'
                );
            }

            const channelData: SIWFChannelResponse = channelResponse.data;
            setChannelUrl(channelData.url);
            setChannelToken(channelData.channelToken);
            onChannelCreatedRef.current?.(channelData);

            // Start polling
            setIsPolling(true);
            pollStartTime.current = Date.now();

            pollingRef.current = setInterval(async () => {
                if (cancelledRef.current) {
                    stopPolling();
                    return;
                }

                // Check timeout
                if (pollStartTime.current && Date.now() - pollStartTime.current > pollTimeout) {
                    stopPolling();
                    const timeoutError = new FarcasterCoreAuthError(
                        "Sign-in timed out",
                        'CHANNEL_TIMEOUT'
                    );
                    setError(timeoutError);
                    onErrorRef.current?.(timeoutError);
                    setChannelUrl(null);
                    setChannelToken(null);
                    return;
                }

                try {
                    const statusResponse = await authClientRef.current.farcaster.channelStatus({
                        channelToken: channelData.channelToken,
                    });

                    if (statusResponse.error) {
                        // Channel might have expired
                        if (statusResponse.error.message?.includes('expired')) {
                            stopPolling();
                            const expiredError = new FarcasterCoreAuthError(
                                "Channel expired",
                                'CHANNEL_EXPIRED'
                            );
                            setError(expiredError);
                            onErrorRef.current?.(expiredError);
                            setChannelUrl(null);
                            setChannelToken(null);
                        }
                        return;
                    }

                    const status: SIWFChannelStatus = statusResponse.data;

                    if (status.state === 'completed' && status.message && status.signature && status.fid) {
                        stopPolling();
                        setIsVerifying(true);

                        // Verify signature and create session
                        const verifyResponse = await authClientRef.current.farcaster.verifySignature({
                            channelToken: channelData.channelToken,
                            message: status.message,
                            signature: status.signature,
                            fid: status.fid,
                            username: status.username,
                            displayName: status.displayName,
                            pfpUrl: status.pfpUrl,
                            bio: status.bio,
                        });

                        if (verifyResponse.error) {
                            throw new FarcasterCoreAuthError(
                                verifyResponse.error.message || "Verification failed",
                                'INVALID_SIGNATURE'
                            );
                        }

                        setUser(verifyResponse.data.user);
                        setSession(verifyResponse.data.session);
                        setChannelUrl(null);
                        setChannelToken(null);
                        onSuccessRef.current?.(verifyResponse.data);
                        setIsVerifying(false);
                    }
                } catch (err) {
                    stopPolling();
                    const pollingError = FarcasterCoreAuthError.from(err, 'POLLING_FAILED');
                    setError(pollingError);
                    onErrorRef.current?.(pollingError);
                    setChannelUrl(null);
                    setChannelToken(null);
                    setIsVerifying(false);
                }
            }, pollInterval);

            return channelData;
        } catch (err) {
            const error = FarcasterCoreAuthError.from(err);
            setError(error);
            onErrorRef.current?.(error);
            return null;
        } finally {
            setIsCreatingChannel(false);
        }
    }, [user, session, pollInterval, pollTimeout, stopPolling]);

    const signOut = useCallback(async () => {
        setIsSigningOut(true);
        stopPolling();
        try {
            await authClientRef.current.signOut();
        } catch (err) {
            // Ignore sign out errors
        } finally {
            setUser(null);
            setSession(null);
            setError(null);
            setChannelUrl(null);
            setChannelToken(null);
            hasCheckedSession.current = false;
            wasAuthenticated.current = false;
            setIsSigningOut(false);
            onSignOutRef.current?.();
        }
    }, [stopPolling]);

    const isLoading = isCreatingChannel || isPolling || isVerifying;
    const isAuthenticated = user !== null && session !== null;

    return {
        createChannel,
        cancel,
        signOut,
        channelUrl,
        channelToken,
        isCreatingChannel,
        isPolling,
        isVerifying,
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
