import type { AuthPluginSchema, BetterAuthPlugin, User as BetterAuthUser } from "better-auth";
import { APIError } from "better-auth/api";
import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from "better-auth/api";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { getUserDataByFid } from "./utils/farcasterHubFetch";
import { getDomainFromUrl } from "./utils/helper";
/*
    To Create A Random Cuid As The Primary Key For The Custom "farcasterUser" Table
*/
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv'
config();
// Constants
const HTTP_HUB_URL = process.env.FARCASTER_HTTP_HUB || 'https://hub.pinata.cloud'
const AUTH_URL = process.env.BETTER_AUTH_URL || process.env.APP_URL || 'http://localhost:3000';


type User = BetterAuthUser & { fid?: string };

type FarcasterUser = {
    id: string;
    fid: string;
    username?: string | null;
    displayName?: string | null;
    twitterUsername?: string | null;
    userId: string;
    pfp?: string | null;
    createdAt: Date;
};

export const farcasterAuth = (
    { createFarcasterUserTable = true }:
        { createFarcasterUserTable?: boolean }
) => {
    const schema = {
        user: {
            fields: {
                fid: {
                    type: "string",
                    unique: true,
                    required: false,
                },
            },
        },
        ...(createFarcasterUserTable ? {
            farcasterUser: {
                fields: {
                    id: {
                        type: "string",
                        unique: true,
                        required: true,
                        defaultValue: () => createId(),
                    },
                    fid: {
                        type: "string",
                        unique: true,
                        required: true,
                    },
                    username: {
                        type: "string",
                        required: false,
                    },
                    displayName: {
                        type: "string",
                        required: false,
                    },
                    twitterUsername: {
                        type: "string",
                        required: false,
                    },
                    pfp: {
                        type: "string",
                        required: false,
                        defaultValue: "https://placehold.co/200x200?text=pfp",
                    },
                    userId: {
                        type: "string",
                        unique: true,
                        required: true,
                        references: {
                            model: "user",
                            field: "id",
                        }
                    },
                    createdAt: {
                        type: "date",
                        required: true,
                        defaultValue: () => new Date(),
                    },
                },
            }
        } : {})
    } as AuthPluginSchema

    return {
        id: "farcaster",
        schema: schema,
        endpoints: {
            initiateFarcasterSignIn: createAuthEndpoint("/farcaster/initiate", { method: "GET" }, async (ctx) => {
                const nonce = ctx.context.generateId({ model: "passkey", size: 32 });
                return ctx.json({ nonce });
            }),
            verifyFarcasterSignIn: createAuthEndpoint("/farcaster/verify", { method: "POST" }, async (ctx) => {
                const { message, signature, nonceFromClient } = ctx.body as {
                    message: string;
                    signature: `0x${string}`;
                    nonceFromClient: string;
                };

                const appClient = createAppClient({
                    ethereum: viemConnector(),
                });

                const domain = getDomainFromUrl(AUTH_URL);

                try {
                    const verifyResponse = await appClient.verifySignInMessage({
                        message,
                        signature,
                        domain,
                        nonce: nonceFromClient,
                    });

                    if (!verifyResponse.success) {
                        throw new APIError("UNAUTHORIZED", { message: "Farcaster sign-in verification failed." });
                    }

                    const fid = verifyResponse.fid;

                    // Checks the Better-Auth User Table To See If The User Has Been Registered Before
                    let user = await ctx.context.adapter.findOne({
                        model: "user",
                        where: [
                            { field: "fid", value: fid.toString() },
                        ],
                    }) as User

                    const farcasterData = await getUserDataByFid(fid, HTTP_HUB_URL);
                    const name = farcasterData.DISPLAY || farcasterData.USERNAME || `User ${fid}`;
                    const pfp = farcasterData.PFP || "https://placehold.co/200x200?text=pfp";

                    let farcasterUserDb: FarcasterUser | undefined;
                    if (createFarcasterUserTable) {
                        farcasterUserDb = await ctx.context.adapter.findOne({
                            model: "farcasterUser",
                            where: [
                                { field: "fid", value: fid.toString() },
                            ],
                        }) as FarcasterUser;
                    }


                    // Flow For Creating A New User
                    // A New User, Account and FarcasterUser Will Be Created In Their Respected Table
                    if (!user) {
                        // Every User In Better-Auth Should Have An Email Address
                        // An Arbitrary Email Address Will Be Set For Each New User
                        const userEmail = `${fid}@farcaster.emails`;

                        // A new record in the "user" table
                        user = await ctx.context.internalAdapter.createUser({
                            email: userEmail,
                            name: name || `User ${fid}`,
                            image: pfp,
                            emailVerified: false,
                            fid: fid.toString(),
                        });

                        // A new record in the "acount" table
                        await ctx.context.internalAdapter.createAccount({
                            userId: user.id,
                            providerId: "farcaster",
                            accountId: fid.toString(),
                        });

                        if (createFarcasterUserTable) {
                            // A new record in the (custom made by this plugin) "farcasterUser" table
                            await ctx.context.adapter.create({
                                model: "farcasterUser",
                                data: {
                                    fid: fid.toString(),
                                    userId: user.id,
                                    username: farcasterData.USERNAME || null,
                                    displayName: farcasterData.DISPLAY || null,
                                    twitterUsername: farcasterData.TWITTER || null,
                                    pfp: farcasterData.PFP,
                                }
                            })
                        }
                    } else {
                        // Update user data if they have changed
                        if (
                            (user.image !== pfp) ||
                            (user.name !== name) ||
                            (farcasterUserDb && (farcasterData.PFP !== farcasterUserDb.pfp)) ||
                            (farcasterUserDb && (farcasterData.USERNAME !== farcasterUserDb.username)) ||
                            (farcasterUserDb && (farcasterData.DISPLAY !== farcasterUserDb.displayName)) ||
                            (farcasterUserDb && (farcasterData.TWITTER !== farcasterUserDb.twitterUsername))
                        ) {
                            if (createFarcasterUserTable) {
                                await ctx.context.adapter.update({
                                    model: "farcasterUser",
                                    where: [
                                        { field: "fid", value: fid.toString() },
                                    ],
                                    update: {
                                        username: farcasterData.USERNAME || null,
                                        displayName: farcasterData.DISPLAY || null,
                                        twitterUsername: farcasterData.TWITTER || null,
                                        pfp: farcasterData.PFP || "https://placehold.co/200x200?text=pfp",
                                    }
                                })
                            };
                            user = await ctx.context.internalAdapter.updateUser(user.id, {
                                ...(name && { name }),
                                ...(pfp && { image: pfp })
                            });
                        }
                    }

                    // Create A Session Cookie And Set It In The Response
                    const session = await ctx.context.internalAdapter.createSession(user.id, ctx);
                    await setSessionCookie(ctx,
                        {
                            session,
                            user
                        },
                        false,
                        {
                            secure: true,
                            sameSite: "none",
                            httpOnly: true,
                            path: "/"
                        }
                    );

                    return ctx.json({
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            image: user.image,
                            fid: user.fid
                        },
                        token: session.token,
                        success: true
                    });

                } catch (error: any) {
                    console.error("Farcaster verification error:", error);
                    throw new APIError("INTERNAL_SERVER_ERROR", {
                        message: error.message || "Farcaster sign-in failed"
                    });
                }
            }),
        },
    } satisfies BetterAuthPlugin;
};