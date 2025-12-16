/**
 * Error codes for Farcaster Core authentication operations
 */
export type FarcasterCoreAuthErrorCode =
    | 'INVALID_SIGNATURE'
    | 'CHANNEL_EXPIRED'
    | 'CHANNEL_TIMEOUT'
    | 'SESSION_EXPIRED'
    | 'RATE_LIMITED'
    | 'NETWORK_ERROR'
    | 'POLLING_FAILED'
    | 'CLIENT_NOT_AVAILABLE'
    | 'FID_MISMATCH'
    | 'UNKNOWN';

/**
 * Custom error class for Farcaster Core authentication errors
 * Provides structured error information with error codes
 */
export class FarcasterCoreAuthError extends Error {
    /**
     * Error code for programmatic error handling
     */
    readonly code: FarcasterCoreAuthErrorCode;

    /**
     * The original error that caused this error, if any
     */
    readonly cause?: Error;

    constructor(
        message: string,
        code: FarcasterCoreAuthErrorCode = 'UNKNOWN',
        cause?: Error
    ) {
        super(message);
        this.name = 'FarcasterCoreAuthError';
        this.code = code;
        this.cause = cause;

        // Maintains proper stack trace for where our error was thrown (only in V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FarcasterCoreAuthError);
        }
    }

    /**
     * Create an error from an unknown thrown value
     */
    static from(err: unknown, code: FarcasterCoreAuthErrorCode = 'UNKNOWN'): FarcasterCoreAuthError {
        if (err instanceof FarcasterCoreAuthError) {
            return err;
        }
        if (err instanceof Error) {
            return new FarcasterCoreAuthError(err.message, code, err);
        }
        return new FarcasterCoreAuthError(String(err), code);
    }
}
