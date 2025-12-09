import type { BetterAuthPlugin } from "better-auth";
import { APIError, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from "better-auth/api";
import { createClient, Errors } from "@farcaster/quick-auth";
import { z } from "zod";

// Import and re-export types from the shared types file
import type {
    FarcasterUser,
    FarcasterPluginOptions,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "./types";

export type {
    FarcasterUser,
    FarcasterPluginOptions,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
};

// Type for user records from the adapter
type UserRecord = { id: string;[key: string]: unknown };

// Input schemas
const signInSchema = z.object({
    token: z.string().min(1, "Token is required"),
});

const linkAccountSchema = z.object({
    token: z.string().min(1, "Token is required"),
});

/**
 * Farcaster authentication plugin for Better Auth
 * Uses Farcaster Quick Auth to verify JWT tokens
 */
export const farcasterAuth = (options: FarcasterPluginOptions) => {
    const client = createClient();
    const domain = getDomainFromUrl(options.domain);

    const cookieOptions = {
        secure: true,
        sameSite: "none" as const,
        httpOnly: true,
        path: "/",
        ...options.cookieOptions,
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
             * Sign in with Farcaster Quick Auth token
             */
            signIn: createAuthEndpoint(
                "/farcaster/sign-in",
                {
                    method: "POST",
                    body: signInSchema,
                    metadata: {
                        openapi: {
                            summary: "Sign in with Farcaster",
                            description: "Authenticate a user using a Farcaster Quick Auth token",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const { token } = ctx.body;

                    try {
                        const payload = await client.verifyJwt({
                            token,
                            domain,
                        });

                        const fid = payload.sub;

                        if (!fid) {
                            throw new APIError("BAD_REQUEST", {
                                message: "Invalid token: no FID found",
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
                                    name: additionalData.name || `Farcaster User ${fid}`,
                                    image: additionalData.image,
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

                        return ctx.json({
                            user: user as unknown as FarcasterUser,
                            session,
                        });
                    } catch (error) {
                        if (error instanceof APIError) {
                            throw error;
                        }

                        if (error instanceof Errors.InvalidTokenError) {
                            throw new APIError("UNAUTHORIZED", {
                                message: "Invalid or expired Farcaster token",
                            });
                        }

                        ctx.context.logger.error("Farcaster auth error:", error);

                        throw new APIError("INTERNAL_SERVER_ERROR", {
                            message: "Authentication failed",
                        });
                    }
                }
            ),

            /**
             * Link an existing account to a Farcaster FID
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
                            description: "Link an existing account to a Farcaster FID",
                            tags: ["Farcaster"],
                        },
                    },
                },
                async (ctx) => {
                    const { token } = ctx.body;
                    const session = ctx.context.session;

                    try {
                        const payload = await client.verifyJwt({
                            token,
                            domain,
                        });

                        const fid = payload.sub;

                        if (!fid) {
                            throw new APIError("BAD_REQUEST", {
                                message: "Invalid token: no FID found",
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

                        if (error instanceof Errors.InvalidTokenError) {
                            throw new APIError("UNAUTHORIZED", {
                                message: "Invalid or expired Farcaster token",
                            });
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
                pathMatcher: (path: string) => path === "/farcaster/sign-in",
                max: 10,
                window: 60, // 10 requests per minute
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
 * Extract hostname from a URL string
 * @param url - URL string (e.g., "https://example.com" or "example.com")
 * @returns The hostname portion of the URL
 */
function getDomainFromUrl(url: string): string {
    // If it's already just a hostname, return it
    if (!url.includes("://") && !url.startsWith("//")) {
        // Remove any port or path
        return url.split(":")[0].split("/")[0];
    }

    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch {
        // If parsing fails, try to extract hostname manually
        const cleaned = url.replace(/^(https?:)?\/\//, "");
        return cleaned.split(":")[0].split("/")[0];
    }
}