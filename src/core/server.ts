import type { BetterAuthPlugin } from "better-auth";
import { APIError, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";

// Import types
import type {
    FarcasterUser,
} from "../types";
import type {
    FarcasterCorePluginOptions,
    SIWFChannelResponse,
    SIWFVerifyResponse,
} from "./types";

// Re-export types for convenience
export type {
    FarcasterCorePluginOptions,
    SIWFChannelResponse,
    SIWFVerifyResponse,
};

// Type for user records from the adapter
type UserRecord = { id: string;[key: string]: unknown };

// Input schemas
const createChannelSchema = z.object({
    nonce: z.string().min(8).optional(),
    notBefore: z.string().optional(),
    expirationTime: z.string().optional(),
    requestId: z.string().optional(),
});

const verifySignatureSchema = z.object({
    channelToken: z.string().min(1, "Channel token is required"),
    message: z.string().min(1, "Message is required"),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format"),
    fid: z.number().int().positive("FID must be a positive integer"),
    username: z.string().optional(),
    displayName: z.string().optional(),
    pfpUrl: z.string().url().optional().or(z.literal('')),
    bio: z.string().optional(),
});

const linkAccountSchema = z.object({
    channelToken: z.string().min(1, "Channel token is required"),
    message: z.string().min(1, "Message is required"),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format"),
    fid: z.number().int().positive("FID must be a positive integer"),
});

/**
 * Extract hostname from a URL string
 */
function getDomainFromUrl(url: string): string {
    if (!url.includes("://") && !url.startsWith("//")) {
        return url.split(":")[0].split("/")[0];
    }
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch {
        const cleaned = url.replace(/^(https?:)?\/\//, "");
        return cleaned.split(":")[0].split("/")[0];
    }
}

/**
 * Farcaster Core authentication plugin for Better Auth
 * Uses channel-based SIWF (Sign In With Farcaster) for OAuth-like authentication
 * 
 * This plugin uses @farcaster/auth-client to create channels and verify signatures.
 * It's designed for regular web pages where users authenticate via QR codes or deeplinks.
 * 
 * @example
 * ```ts
 * import { farcasterCoreAuth } from "better-auth-farcaster-plugin/core";
 * 
 * export const auth = betterAuth({
 *     plugins: [
 *         farcasterCoreAuth({
 *             domain: "example.com",
 *             siweUri: "https://example.com/login",
 *         }),
 *     ],
 * });
 * ```
 */
export const farcasterCoreAuth = (options: FarcasterCorePluginOptions) => {
    const domain = getDomainFromUrl(options.domain);
    const siweUri = options.siweUri;
    const relay = options.relay || 'https://relay.farcaster.xyz';

    const cookieOptions = {
        secure: true,
        sameSite: "lax" as const,
        httpOnly: true,
        path: "/",
        ...options.cookieOptions,
    };

    // Lazy load @farcaster/auth-client to make it optional
    let appClient: any = null;
    const getAppClient = async () => {
        if (!appClient) {
            try {
                const { createAppClient, viemConnector } = await import('@farcaster/auth-client');
                appClient = createAppClient({
                    relay,
                    ethereum: viemConnector(),
                });
            } catch (error) {
                throw new APIError("INTERNAL_SERVER_ERROR", {
                    message: "Failed to initialize Farcaster auth client. Make sure @farcaster/auth-client and viem are installed.",
                });
            }
        }
        return appClient;
    };

    return {
        id: "farcaster",
        schema: {
            user: {
                fields: {
                    fid: {
                        type: "number",
                        unique: true,
                        required: false,
                    },
                },
            },
        },
        endpoints: {
            /**
             * Create a new SIWF channel for authentication
             * Returns a URL that can be displayed as a QR code or used as a deeplink
             */
            createChannel: createAuthEndpoint(
                "/farcaster/create-channel",
                {
                    method: "POST",
                    body: createChannelSchema,
                    metadata: {
                        openapi: {
                            summary: "Create SIWF channel",
                            description: "Create a new Sign In With Farcaster channel for authentication",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const { nonce, notBefore, expirationTime, requestId } = ctx.body || {};

                    try {
                        const client = await getAppClient();

                        const channelParams: any = {
                            siweUri,
                            domain,
                        };

                        if (nonce) channelParams.nonce = nonce;
                        if (notBefore) channelParams.notBefore = notBefore;
                        if (expirationTime) channelParams.expirationTime = expirationTime;
                        if (requestId) channelParams.requestId = requestId;

                        const result = await client.createChannel(channelParams);

                        if (result.isError) {
                            throw new APIError("INTERNAL_SERVER_ERROR", {
                                message: result.error?.message || "Failed to create channel",
                            });
                        }

                        const response: SIWFChannelResponse = {
                            channelToken: result.data.channelToken,
                            url: result.data.url,
                            nonce: result.data.nonce,
                        };

                        return ctx.json(response);
                    } catch (error) {
                        if (error instanceof APIError) {
                            throw error;
                        }

                        ctx.context.logger.error("Failed to create SIWF channel:", error);

                        throw new APIError("INTERNAL_SERVER_ERROR", {
                            message: "Failed to create authentication channel",
                        });
                    }
                }
            ),

            /**
             * Poll for channel status (client-side convenience endpoint)
             */
            channelStatus: createAuthEndpoint(
                "/farcaster/channel-status",
                {
                    method: "POST",
                    body: z.object({
                        channelToken: z.string().min(1, "Channel token is required"),
                    }),
                    metadata: {
                        openapi: {
                            summary: "Get SIWF channel status",
                            description: "Poll the status of a Sign In With Farcaster channel",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const { channelToken } = ctx.body;

                    try {
                        const client = await getAppClient();

                        const result = await client.status({ channelToken });

                        if (result.isError) {
                            throw new APIError("BAD_REQUEST", {
                                message: result.error?.message || "Failed to get channel status",
                            });
                        }

                        return ctx.json(result.data);
                    } catch (error) {
                        if (error instanceof APIError) {
                            throw error;
                        }

                        throw new APIError("INTERNAL_SERVER_ERROR", {
                            message: "Failed to get channel status",
                        });
                    }
                }
            ),

            /**
             * Verify a SIWF signature and create a session
             */
            verifySignature: createAuthEndpoint(
                "/farcaster/verify-signature",
                {
                    method: "POST",
                    body: verifySignatureSchema,
                    metadata: {
                        openapi: {
                            summary: "Verify SIWF signature",
                            description: "Verify a Sign In With Farcaster signature and create a session",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const { channelToken, message, signature, fid, username, displayName, pfpUrl, bio } = ctx.body;

                    try {
                        const client = await getAppClient();

                        // Verify the message using the auth client
                        const verifyResult = await client.verifySignInMessage({
                            message,
                            signature: signature as `0x${string}`,
                            domain,
                            nonce: extractNonceFromMessage(message),
                        });

                        if (verifyResult.isError || !verifyResult.success) {
                            throw new APIError("UNAUTHORIZED", {
                                message: "Invalid signature",
                            });
                        }

                        // Check FID matches
                        if (verifyResult.fid !== fid) {
                            throw new APIError("UNAUTHORIZED", {
                                message: "FID mismatch",
                            });
                        }

                        // Check if user already exists with this FID
                        const existingUser = await ctx.context.adapter.findOne({
                            model: "user",
                            where: [
                                {
                                    field: "fid",
                                    value: fid,
                                },
                            ],
                        }) as UserRecord | null;

                        let user: UserRecord;

                        if (existingUser) {
                            // Update user with latest profile data if provided
                            const updateData: Record<string, any> = {};
                            if (displayName) updateData.name = displayName;
                            if (pfpUrl) updateData.image = pfpUrl;

                            if (Object.keys(updateData).length > 0) {
                                await ctx.context.adapter.update({
                                    model: "user",
                                    where: [{ field: "id", value: existingUser.id }],
                                    update: updateData,
                                });
                            }

                            user = existingUser;
                        } else {
                            // Resolve additional user data if provided
                            const additionalData = options.resolveUserData
                                ? await options.resolveUserData(fid)
                                : { name: undefined, email: undefined, image: undefined };

                            // Create new user with FID
                            const createdUser = await ctx.context.adapter.create({
                                model: "user",
                                data: {
                                    fid,
                                    email: additionalData.email || `${fid}@farcaster.local`,
                                    name: additionalData.name || displayName || username || `Farcaster User ${fid}`,
                                    image: additionalData.image || pfpUrl,
                                    emailVerified: true,
                                },
                            }) as UserRecord;
                            user = createdUser;
                        }

                        // Create session for the user
                        const session = await ctx.context.internalAdapter.createSession(
                            user.id,
                            false // rememberMe = true (dontRememberMe = false)
                        );

                        if (!session) {
                            throw new APIError("INTERNAL_SERVER_ERROR", {
                                message: "Failed to create session",
                            });
                        }

                        await setSessionCookie(
                            ctx,
                            {
                                session,
                                user: user as unknown as FarcasterUser,
                            },
                            false,
                            cookieOptions
                        );

                        const response: SIWFVerifyResponse = {
                            success: true,
                            user: user as unknown as FarcasterUser,
                            session,
                        };

                        return ctx.json(response);
                    } catch (error) {
                        if (error instanceof APIError) {
                            throw error;
                        }

                        ctx.context.logger.error("SIWF verification error:", error);

                        throw new APIError("INTERNAL_SERVER_ERROR", {
                            message: "Signature verification failed",
                        });
                    }
                }
            ),

            /**
             * Link a Farcaster account to an existing user via SIWF
             */
            link: createAuthEndpoint(
                "/farcaster/link",
                {
                    method: "POST",
                    body: linkAccountSchema,
                    use: [sessionMiddleware],
                    metadata: {
                        openapi: {
                            summary: "Link Farcaster account",
                            description: "Link a Farcaster account to the current authenticated user via SIWF",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const { channelToken, message, signature, fid } = ctx.body;
                    const session = ctx.context.session;

                    try {
                        const client = await getAppClient();

                        // Verify the message
                        const verifyResult = await client.verifySignInMessage({
                            message,
                            signature: signature as `0x${string}`,
                            domain,
                            nonce: extractNonceFromMessage(message),
                        });

                        if (verifyResult.isError || !verifyResult.success) {
                            throw new APIError("UNAUTHORIZED", {
                                message: "Invalid signature",
                            });
                        }

                        if (verifyResult.fid !== fid) {
                            throw new APIError("UNAUTHORIZED", {
                                message: "FID mismatch",
                            });
                        }

                        // Check if this FID is already linked to another account
                        const existingUser = await ctx.context.adapter.findOne({
                            model: "user",
                            where: [
                                {
                                    field: "fid",
                                    value: fid,
                                },
                            ],
                        }) as UserRecord | null;

                        if (existingUser && existingUser.id !== session.user.id) {
                            throw new APIError("BAD_REQUEST", {
                                message: "This Farcaster account is already linked to another user",
                            });
                        }

                        // Update the user with the FID
                        const updatedUser = await ctx.context.adapter.update({
                            model: "user",
                            where: [
                                {
                                    field: "id",
                                    value: session.user.id,
                                },
                            ],
                            update: {
                                fid,
                            },
                        }) as UserRecord | null;

                        if (!updatedUser) {
                            throw new APIError("INTERNAL_SERVER_ERROR", {
                                message: "Failed to update user",
                            });
                        }

                        return ctx.json({
                            success: true,
                            user: updatedUser as unknown as FarcasterUser,
                        });
                    } catch (error) {
                        if (error instanceof APIError) {
                            throw error;
                        }

                        ctx.context.logger.error("Farcaster link error:", error);

                        throw new APIError("INTERNAL_SERVER_ERROR", {
                            message: "Failed to link Farcaster account",
                        });
                    }
                }
            ),

            /**
             * Unlink Farcaster from the current account
             */
            unlink: createAuthEndpoint(
                "/farcaster/unlink",
                {
                    method: "POST",
                    use: [sessionMiddleware],
                    metadata: {
                        openapi: {
                            summary: "Unlink Farcaster account",
                            description: "Remove Farcaster FID from the current account",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const session = ctx.context.session;
                    const currentUser = session.user as FarcasterUser;

                    if (!currentUser.fid) {
                        throw new APIError("BAD_REQUEST", {
                            message: "No Farcaster account linked",
                        });
                    }

                    const updatedUser = await ctx.context.adapter.update({
                        model: "user",
                        where: [
                            {
                                field: "id",
                                value: session.user.id,
                            },
                        ],
                        update: {
                            fid: null,
                        },
                    }) as UserRecord | null;

                    if (!updatedUser) {
                        throw new APIError("INTERNAL_SERVER_ERROR", {
                            message: "Failed to update user",
                        });
                    }

                    return ctx.json({
                        success: true,
                        user: updatedUser as unknown as FarcasterUser,
                    });
                }
            ),

            /**
             * Get the Farcaster profile for the current user
             */
            profile: createAuthEndpoint(
                "/farcaster/profile",
                {
                    method: "GET",
                    use: [sessionMiddleware],
                    metadata: {
                        openapi: {
                            summary: "Get Farcaster profile",
                            description: "Get the Farcaster FID and user data for the authenticated user",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const session = ctx.context.session;
                    const currentUser = session.user as FarcasterUser;

                    if (!currentUser?.fid) {
                        throw new APIError("BAD_REQUEST", {
                            message: "No Farcaster FID found for user",
                        });
                    }

                    return ctx.json({
                        fid: currentUser.fid,
                        user: currentUser,
                    });
                }
            ),
        },

        // Rate limiting for authentication endpoints
        rateLimit: [
            {
                pathMatcher: (path: string) => path === "/farcaster/create-channel",
                max: 10,
                window: 60, // 10 requests per minute
            },
            {
                pathMatcher: (path: string) => path === "/farcaster/verify-signature",
                max: 10,
                window: 60, // 10 requests per minute
            },
            {
                pathMatcher: (path: string) => path === "/farcaster/channel-status",
                max: 60,
                window: 60, // 60 requests per minute (for polling)
            },
            {
                pathMatcher: (path: string) => path === "/farcaster/link",
                max: 5,
                window: 60, // 5 requests per minute
            },
        ],
    } satisfies BetterAuthPlugin;
};

/**
 * Extract nonce from a SIWE message
 */
function extractNonceFromMessage(message: string): string {
    const nonceMatch = message.match(/Nonce: ([^\n]+)/);
    return nonceMatch ? nonceMatch[1] : '';
}
