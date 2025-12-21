import type { BetterAuthPlugin } from "better-auth";
import { APIError, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from "better-auth/api";
import { createClient, Errors } from "@farcaster/quick-auth";
import { z } from "zod";

// Import types from shared types file
import type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
} from "../types";

// Re-export shared types for convenience
export type {
    FarcasterUser,
    FarcasterSignInResponse,
    FarcasterProfileResponse,
    FarcasterLinkResponse,
};

/**
 * Type utility to add Farcaster Miniapp types to your auth instance.
 * Use this when Better Auth's automatic type inference doesn't work with external plugins.
 * 
 * This preserves all base Better Auth types (getSession, signInEmail, etc.) while
 * adding the Farcaster Miniapp API types.
 * 
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { farcasterMiniappAuth, type WithFarcasterMiniapp } from "better-auth-farcaster-plugin/miniapp";
 * 
 * const _auth = betterAuth({
 *   plugins: [farcasterMiniappAuth({ domain: "example.com" })],
 * });
 * 
 * // Export with proper types - preserves all Better Auth base types!
 * export const auth = _auth as WithFarcasterMiniapp<typeof _auth>;
 * 
 * // Now you have autocomplete for both base methods and plugin methods!
 * await auth.api.getSession({ headers: ... });  // ✓ Base Better Auth method
 * await auth.api.signInFarcasterMiniapp({ body: { token: "..." } });  // ✓ Plugin method
 * ```
 */
export type WithFarcasterMiniapp<T> = T extends { api: infer API }
    ? Omit<T, 'api'> & {
        api: API & {
            signInFarcasterMiniapp: (params: { body: { token: string }; headers?: Headers }) => Promise<FarcasterSignInResponse>;
            linkFarcasterMiniapp: (params: { body: { token: string }; headers?: Headers }) => Promise<FarcasterLinkResponse>;
            unlinkFarcasterMiniapp: (params: { headers?: Headers }) => Promise<FarcasterLinkResponse>;
            profileFarcasterMiniapp: (params: { headers?: Headers }) => Promise<FarcasterProfileResponse>;
        }
    }
    : T;

/**
 * Type for Farcaster Miniapp server API actions
 * Use this type for proper autocomplete when Better Auth's automatic
 * type inference doesn't work with external plugins.
 * 
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { farcasterMiniappAuth, type FarcasterMiniappServerActions } from "better-auth-farcaster-plugin/miniapp";
 * 
 * const auth = betterAuth({
 *   plugins: [farcasterMiniappAuth({ domain: "example.com" })],
 * });
 * 
 * // Option 1: Cast the auth object
 * export const typedAuth = auth as typeof auth & {
 *   api: { farcasterMiniapp: FarcasterMiniappServerActions }
 * };
 * await typedAuth.api.farcasterMiniapp.signIn({ body: { token: "..." } });
 * 
 * // Option 2: Use the helper function
 * import { getFarcasterMiniappApi } from "better-auth-farcaster-plugin/miniapp";
 * const farcasterApi = getFarcasterMiniappApi(auth);
 * await farcasterApi.signIn({ body: { token: "..." } });
 * ```
 */
export interface FarcasterMiniappServerActions {
    signIn: (params: { body: { token: string }; headers?: Headers }) => Promise<FarcasterSignInResponse>;
    link: (params: { body: { token: string }; headers?: Headers }) => Promise<FarcasterLinkResponse>;
    unlink: (params: { headers?: Headers }) => Promise<FarcasterLinkResponse>;
    profile: (params: { headers?: Headers }) => Promise<FarcasterProfileResponse>;
}

/**
 * Helper function to get typed Farcaster Miniapp server actions from any auth instance.
 * Use this to get proper autocomplete when Better Auth's type inference fails.
 * 
 * @param auth - Your Better Auth instance (typed as any)
 * @returns Typed FarcasterMiniappServerActions object
 * 
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { farcasterMiniappAuth, getFarcasterMiniappApi } from "better-auth-farcaster-plugin/miniapp";
 * 
 * const auth = betterAuth({
 *   plugins: [farcasterMiniappAuth({ domain: "example.com" })],
 * });
 * 
 * // Get typed Farcaster API methods
 * const farcasterApi = getFarcasterMiniappApi(auth);
 * 
 * // Now you have proper autocomplete!
 * const result = await farcasterApi.signIn({ body: { token: "..." } });
 * ```
 */
export function getFarcasterMiniappApi(auth: any): FarcasterMiniappServerActions {
    return (auth.api as any).farcasterMiniapp as FarcasterMiniappServerActions;
}

/**
 * Plugin options for Farcaster Miniapp authentication
 * Uses Farcaster Quick Auth for JWT verification in miniapp context
 */
export interface FarcasterMiniappPluginOptions {
    /**
     * The domain of your application (e.g., "myapp.com" or "https://myapp.com")
     * Used to verify the JWT token's audience
     */
    domain: string;
    /**
     * Optional function to resolve additional user data from Farcaster
     * @param fid - The Farcaster ID
     * @returns Additional user data to store
     */
    resolveUserData?: (fid: number) => Promise<{
        name?: string;
        email?: string;
        image?: string;
    }>;
    /**
     * Cookie configuration options
     */
    cookieOptions?: {
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        httpOnly?: boolean;
        path?: string;
    };
}

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

/**
 * Farcaster Miniapp authentication plugin for Better Auth
 * Uses Farcaster Quick Auth to verify JWT tokens from miniapp context
 * 
 * @example
 * ```ts
 * import { farcasterMiniappAuth } from "better-auth-farcaster-plugin/miniapp";
 * 
 * export const auth = betterAuth({
 *     plugins: [
 *         farcasterMiniappAuth({
 *             domain: "https://example.com",
 *         }),
 *     ],
 * });
 * ```
 */
export const farcasterMiniappAuth = (options: FarcasterMiniappPluginOptions): BetterAuthPlugin => {
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
        id: "farcaster-miniapp",
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
                "/farcaster-miniapp/sign-in",
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

                        // Create or update account in the account table
                        const existingAccount = await ctx.context.adapter.findOne({
                            model: "account",
                            where: [
                                { field: "providerId", value: "Farcaster" },
                                { field: "accountId", value: String(fid) },
                            ],
                        });

                        if (!existingAccount) {
                            await ctx.context.adapter.create({
                                model: "account",
                                data: {
                                    accountId: String(fid),
                                    providerId: "Farcaster",
                                    userId: user.id,
                                },
                            });
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
                "/farcaster-miniapp/link",
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
                "/farcaster-miniapp/unlink",
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
                "/farcaster-miniapp/profile",
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
                pathMatcher: (path: string) => path === "/farcaster-miniapp/sign-in",
                max: 10,
                window: 60, // 10 requests per minute
            },
            {
                pathMatcher: (path: string) => path === "/farcaster-miniapp/link",
                max: 5,
                window: 60, // 5 requests per minute
            },
        ],
    };
};
