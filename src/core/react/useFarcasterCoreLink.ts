import { useState, useCallback, useRef } from "react";
import type { FarcasterLinkResponse, FarcasterUser } from "../../types";
import { FarcasterCoreAuthError } from "./errors";

/**
 * Minimal type for Better Auth client with Farcaster Core plugin (link operations)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BetterAuthClientForCoreLink {
    farcaster: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createChannel: (data?: any) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channelStatus: (data: { channelToken: string }) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        link: (data: any) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unlink: () => Promise<any>;
    };
}

/**
 * Options for the useFarcasterCoreLink hook
 */
export interface UseFarcasterCoreLinkOptions {
    /**
     * The Better Auth client instance with Farcaster Core plugin configured.
     */
    authClient: BetterAuthClientForCoreLink;
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
    onError?: (error: FarcasterCoreAuthError) => void;
}

/**
 * Return type for the useFarcasterCoreLink hook
 */
export interface UseFarcasterCoreLinkReturn {
    /**
     * Start the link flow (creates channel and polls)
     */
    link: () => Promise<void>;
    /**
     * Cancel the current link attempt
     */
    cancel: () => void;
    /**
     * Unlink Farcaster from the current account
     */
    unlink: () => Promise<void>;
    /**
     * The channel URL for QR code/deeplink
     */
    channelUrl: string | null;
    /**
     * Whether any operation is in progress
     */
    isLoading: boolean;
    /**
     * Whether linking is in progress
     */
    isLinking: boolean;
    /**
     * Whether polling is in progress
     */
    isPolling: boolean;
    /**
     * Whether unlinking is in progress
     */
    isUnlinking: boolean;
    /**
     * Error from the last operation
     */
    error: FarcasterCoreAuthError | null;
    /**
     * Updated user after operation
     */
    user: FarcasterUser | null;
    /**
     * Reset the hook state
     */
    reset: () => void;
}

/**
 * React hook for linking/unlinking Farcaster accounts via SIWF
 */
export function useFarcasterCoreLink(
    options: UseFarcasterCoreLinkOptions
): UseFarcasterCoreLinkReturn {
    const {
        authClient,
        pollInterval = 2000,
        pollTimeout = 300000,
        onLinkSuccess,
        onUnlinkSuccess,
        onError,
    } = options;

    const [isLinking, setIsLinking] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [error, setError] = useState<FarcasterCoreAuthError | null>(null);
    const [user, setUser] = useState<FarcasterUser | null>(null);
    const [channelUrl, setChannelUrl] = useState<string | null>(null);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const pollStartTime = useRef<number | null>(null);
    const cancelledRef = useRef(false);
    const authClientRef = useRef(authClient);
    const onLinkSuccessRef = useRef(onLinkSuccess);
    const onUnlinkSuccessRef = useRef(onUnlinkSuccess);
    const onErrorRef = useRef(onError);

    authClientRef.current = authClient;
    onLinkSuccessRef.current = onLinkSuccess;
    onUnlinkSuccessRef.current = onUnlinkSuccess;
    onErrorRef.current = onError;

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
        setIsLinking(false);
        setIsPolling(false);
        setIsUnlinking(false);
        setError(null);
        setUser(null);
        setChannelUrl(null);
    }, [stopPolling]);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        stopPolling();
        setChannelUrl(null);
        setError(null);
        setIsLinking(false);
    }, [stopPolling]);

    const link = useCallback(async () => {
        setIsLinking(true);
        setError(null);
        cancelledRef.current = false;

        try {
            // Create channel
            const channelResponse = await authClientRef.current.farcaster.createChannel({});

            if (channelResponse.error) {
                throw new FarcasterCoreAuthError(
                    channelResponse.error.message || "Failed to create channel",
                    'NETWORK_ERROR'
                );
            }

            const channelData = channelResponse.data;
            setChannelUrl(channelData.url);

            // Start polling
            setIsPolling(true);
            pollStartTime.current = Date.now();

            pollingRef.current = setInterval(async () => {
                if (cancelledRef.current) {
                    stopPolling();
                    return;
                }

                if (pollStartTime.current && Date.now() - pollStartTime.current > pollTimeout) {
                    stopPolling();
                    const timeoutError = new FarcasterCoreAuthError("Link timed out", 'CHANNEL_TIMEOUT');
                    setError(timeoutError);
                    onErrorRef.current?.(timeoutError);
                    setChannelUrl(null);
                    setIsLinking(false);
                    return;
                }

                try {
                    const statusResponse = await authClientRef.current.farcaster.channelStatus({
                        channelToken: channelData.channelToken,
                    });

                    if (statusResponse.error) {
                        return;
                    }

                    const status = statusResponse.data;

                    if (status.state === 'completed' && status.message && status.signature && status.fid) {
                        stopPolling();

                        // Link the account
                        const linkResponse = await authClientRef.current.farcaster.link({
                            channelToken: channelData.channelToken,
                            message: status.message,
                            signature: status.signature,
                            fid: status.fid,
                        });

                        if (linkResponse.error) {
                            throw new FarcasterCoreAuthError(
                                linkResponse.error.message || "Linking failed",
                                'INVALID_SIGNATURE'
                            );
                        }

                        setUser(linkResponse.data.user);
                        setChannelUrl(null);
                        setIsLinking(false);
                        onLinkSuccessRef.current?.(linkResponse.data);
                    }
                } catch (err) {
                    stopPolling();
                    const pollingError = FarcasterCoreAuthError.from(err, 'POLLING_FAILED');
                    setError(pollingError);
                    onErrorRef.current?.(pollingError);
                    setChannelUrl(null);
                    setIsLinking(false);
                }
            }, pollInterval);
        } catch (err) {
            const error = FarcasterCoreAuthError.from(err);
            setError(error);
            onErrorRef.current?.(error);
            setIsLinking(false);
        }
    }, [pollInterval, pollTimeout, stopPolling]);

    const unlink = useCallback(async () => {
        setIsUnlinking(true);
        setError(null);

        try {
            const response = await authClientRef.current.farcaster.unlink();

            if (response.error) {
                throw new FarcasterCoreAuthError(response.error.message || "Unlinking failed", 'UNKNOWN');
            }

            setUser(response.data.user);
            onUnlinkSuccessRef.current?.(response.data);
        } catch (err) {
            const error = FarcasterCoreAuthError.from(err);
            setError(error);
            onErrorRef.current?.(error);
        } finally {
            setIsUnlinking(false);
        }
    }, []);

    const isLoading = isLinking || isPolling || isUnlinking;

    return {
        link,
        cancel,
        unlink,
        channelUrl,
        isLoading,
        isLinking,
        isPolling,
        isUnlinking,
        error,
        user,
        reset,
    };
}
