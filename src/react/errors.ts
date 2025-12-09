/**
 * Error codes for Farcaster authentication operations
 */
export type FarcasterAuthErrorCode =
    | 'INVALID_TOKEN'
    | 'SESSION_EXPIRED'
    | 'RATE_LIMITED'
    | 'NETWORK_ERROR'
    | 'TOKEN_FETCH_FAILED'
    | 'UNKNOWN';

/**
 * Custom error class for Farcaster authentication errors
 * Provides structured error information with error codes
 */
export class FarcasterAuthError extends Error {
    /**
     * Error code for programmatic error handling
     */
    readonly code: FarcasterAuthErrorCode;

    /**
     * The original error that caused this error, if any
     */
    readonly cause?: Error;

    constructor(
        message: string,
        code: FarcasterAuthErrorCode = 'UNKNOWN',
        cause?: Error
    ) {
        super(message);
        this.name = 'FarcasterAuthError';
        this.code = code;
        this.cause = cause;

        // Maintains proper stack trace for where our error was thrown (only in V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FarcasterAuthError);
        }
    }

    /**
     * Create an error from an unknown thrown value
     */
    static from(err: unknown, code: FarcasterAuthErrorCode = 'UNKNOWN'): FarcasterAuthError {
        if (err instanceof FarcasterAuthError) {
            return err;
        }
        if (err instanceof Error) {
            return new FarcasterAuthError(err.message, code, err);
        }
        return new FarcasterAuthError(String(err), code);
    }
}
