import type { BetterAuthPlugin, User as BetterAuthUser } from "better-auth";
import { APIError } from "better-auth/api";
import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from "better-auth/api";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { getDomainFromUrl } from "./utils/helper";
import { VerificationTableNonceManager, type NonceManager } from "./utils/NonceManager";

import { config } from 'dotenv'
config();

type User = BetterAuthUser & { fid?: string };

export const farcasterAuth = <TUser extends User>(
    {
        nonceManager,
        resolveUser,
        domain
    }: {
        nonceManager?: NonceManager,
        resolveUser?: (fid: number) => Promise<TUser>,
        domain?: string
    } = {}
) => {
    return {
        id: "farcaster",
        schema: {
            user: {
                fields: {
                    fid: {
                        type: "string",
                        unique: true,
                        required: false,
                    },
                },
            }
        },
        endpoints: {
            initiateFarcasterSignIn: createAuthEndpoint("/farcaster/initiate", { method: "GET" }, async (ctx) => {
                const manager = nonceManager || new VerificationTableNonceManager(ctx.context.adapter);
                const nonce = await manager.generate();
                return ctx.json({ nonce });
            }),
            verifyFarcasterSignIn: createAuthEndpoint("/farcaster/verify", { method: "POST" }, async (ctx) => {
                const { message, signature, nonceFromClient } = ctx.body as {
                    message: string;
                    signature: `0x${string}`;
                    nonceFromClient: string;
                };

                const manager = nonceManager || new VerificationTableNonceManager(ctx.context.adapter);
                const isValid = await manager.consume(nonceFromClient);
                if (!isValid) {
                    throw new APIError("UNAUTHORIZED", { message: "Invalid or expired nonce." });
                }

                const appClient = createAppClient({
                    ethereum: viemConnector(),
                });

                const appdomain = domain || getDomainFromUrl(process.env.BETTER_AUTH_URL);

                try {
                    const verifyResponse = await appClient.verifySignInMessage({
                        message,
                        signature,
                        domain: appdomain,
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

                    if (!user) {
                        // Every User In Better-Auth Should Have An Email Address
                        // An Arbitrary Email Address Will Be Set For Each New User
                        const userEmail = `${fid}@farcaster.emails`;

                        // A new record in the "user" table
                        user = await ctx.context.internalAdapter.createUser({
                            email: userEmail,
                            name: `Farcaster User ID: ${fid}`,
                            emailVerified: false,
                            fid: fid.toString(),
                        });

                        // A new record in the "acount" table
                        await ctx.context.internalAdapter.createAccount({
                            userId: user.id,
                            providerId: "farcaster",
                            accountId: fid.toString(),
                        });
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

                    if (resolveUser) {
                        await resolveUser(fid);
                    }

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