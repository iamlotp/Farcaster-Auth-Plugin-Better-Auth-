# Farcaster Plugin for Better-Auth

## Description
This is a community-made plug-in that will allow you to authenticate users via Farcasters.

## How To Use
1. Add `farcasterAuth` as a plugin to `auth.ts`:
    ```TypeScript filename="auth.ts"
    import { betterAuth } from "better-auth";
    import { prismaAdapter } from "better-auth/adapters/prisma";
    import { farcasterAuth } from "better-auth-farcaster-plugin";

    import { prisma } from "./prisma";
    /*
        // prisma.ts
        import { PrismaClient } from "@prisma/client"
        export const prisma = new PrismaClient()
    */

    export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite",
    }),
    baseURL: process.env.BETTER_AUTH_URL || "https://example.com",
    // Add Your Domain Name Here
    trustedOrigins: ["https://example.com"],
    plugins: [
        farcasterAuth(),
    ]
    })
    ```
*Note:* In the examples provided Prisma is used as the ORM library. You are free to replace it with your ORM library of choice.

2. Add `farcasterAuthClient` as a plugin to `auth-client.ts`:
    ```TypeScript filename="auth-client.ts"
    import { createAuthClient } from "better-auth/react";
    import { farcasterAuthClient } from "better-auth-farcaster-plugin";

    const client = createAuthClient({
        baseURL: "https://example.com",
        plugins: [
            farcasterAuthClient(),
        ],
    });

    // Type the client to include custom farcaster methods
    export const authClient = client as typeof client & {
        farcaster: {
            initiate: () => Promise<{ data: { nonce: string } }>;
            verify: (data: {
                message: string;
                signature: `0x${string}`;
                name?: string;
                pfp?: string;
                nonceFromClient: string;
            }) => Promise<any>;
        };
    };
    ```

3. Setting up the database
    1. To generate the schema required by Better Auth, run the following command
        ```bash
        npx @better-auth/cli@latest generate
        ```
    2. To generate and apply the migration, run the following commands (For Prisma, look [here](https://www.better-auth.com/docs/adapters/drizzle) for other adapters):
    ```bash
    npx prisma generate
    npx prisma migrate dev --name better_auth #(or npx prisma db push) use this command with caution! 
    ```
    
4. Environment variables
    Set these environment variables:
    ```dotenv
    BETTER_AUTH_URL="https://example.com"
    APP_URL="https://example.com"
    FARCASTER_HTTP_HUB="" # Not Required, defaults to "Pinata Hub" if not provided
    ```

5. The Authentication Flow:
    1. Call `authClient.farcaster.initiate` and store the result
        - By doing this a `GET` request is sent to `/api/auth/farcaster/initiate`
        - A random `nonce` will be generated and sent back to the client in the response
        ```TypeScript
        const response = await authClient.farcaster.initiate();
        const nonce = response.data.nonce;
        ```

    2. Call `sdk.actions.signIn` and pass along the nonce you stored from step 1 (`sdk` is the Farcaster Frame SDK)
        - This will generate the properties needed for user verification (e.g. `message` and `signature`)
        ```TypeScript
        const result = await sdk.actions.signIn({ nonce });
        ```

    3. Call `authClient.farcaster.verify` with the required arguments
        - By doing this a `POST` request is sent to `/api/auth/farcaster/verify`
        - If the user provided data are valid:
            - A session cookie will be set for the client in the response
            - The session will be stored in the database and handled by better-auth
            - If the user is a new user a user will be created
            - The user data (pfp, username, twitterUsername, etc.) will be fetched from a farcaster hub and will be stored in the `farcasterUser` table in your database
        ```TypeScript
        await authClient.farcaster.verify({
            message: result.message,
            signature: result.signature as `0x${string}`,
            nonceFromClient: nonce,
        })
        ```

        Here is an example NextJS Client React Component that provides a "Sign In With Farcaster" button:
        ```TypeScript
        'use client';
        import sdk, {
            SignIn as SignInCore,
        } from "@farcaster/frame-sdk";
        import { useCallback, useState } from "react";
        import { Button } from "~/components/ui/button"; // ShadCN Button Component
        import { authClient } from "~/lib/auth/auth-client";


        export function SignInWithFarcasterButton(
            {
                text = "Sign In With Farcaster",
            }:
                {
                    text?: string,
                }
        ) {
            const [signingIn, setSigningIn] = useState(false);
            const [signInFailure, setSignInFailure] = useState<string>();


            const getNonce = useCallback(async () => {
                const response = await authClient.farcaster.initiate();
                const nonce = response.data.nonce;
                if (!nonce) throw new Error("Unable to generate nonce");
                return nonce;
            }, []);

            const handleSignIn = useCallback(async () => {
                try {
                    setSigningIn(true);
                    setSignInFailure(undefined);
                    const nonce = await getNonce();
                    const result = await sdk.actions.signIn({ nonce });
                    await authClient.farcaster.verify({
                        message: result.message,
                        signature: result.signature as `0x${string}`,
                        nonceFromClient: nonce,
                    })
                } catch (e) {
                    if (e instanceof SignInCore.RejectedByUser) {
                        setSignInFailure("Rejected by user");
                        return;
                    }
                    setSignInFailure("Unknown error");
                } finally {
                    setSigningIn(false);
                }
            }, [getNonce]);

            return (
                <>
                    <Button onClick={handleSignIn} disabled={signingIn}>
                        {text}
                    </Button>
                    {signInFailure && !signingIn && (
                        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
                            <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
                            <div className="whitespace-pre">{signInFailure}</div>
                        </div>
                    )}
                </>
            )
        }
        ```
6. You can use the methods provided by better-auth in your app to manage the session, check if the user is authenticated, sign out the user, etc. [Read more:](https://www.better-auth.com/docs/basic-usage#session)