import type { BetterAuthClientPlugin } from "better-auth/types";
import type { farcasterAuth } from "./FarcasterAuth";

type ServerFarcasterPluginReturnType = ReturnType<typeof farcasterAuth>;

export const farcasterAuthClient = (): BetterAuthClientPlugin => {
    return {
        id: "farcaster", // Must match server plugin id
        $InferServerPlugin: {} as ServerFarcasterPluginReturnType,
        getActions: ($fetch) => ({
            farcaster: {
                initiate: async () => {
                    return $fetch("/farcaster/initiate", {
                        method: "GET"
                    }) as Promise<{ data: { nonce: string } }>;
                },
                verify: async (data: {
                    message: string;
                    signature: `0x${string}`;
                    name?: string;
                    pfp?: string;
                    nonceFromClient: string;
                }) => {
                    return $fetch("/farcaster/verify", {
                        method: "POST",
                        body: data,
                    });
                },
            }
        }),
    } satisfies BetterAuthClientPlugin;
};

export type FarcasterAuthClientType = {
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