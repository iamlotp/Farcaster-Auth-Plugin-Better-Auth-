import type { BetterAuthClientPlugin } from "better-auth/client";
import type { BetterFetchOption } from "@better-fetch/fetch";
import type { FarcasterSignInResponse, FarcasterProfileResponse, FarcasterLinkResponse } from "./FarcasterAuth";

// Response wrapper types (better-fetch returns { data, error })
type FetchResponse<T> = {
    data: T | null;
    error: {
        message: string;
        status: number;
    } | null;
};

/**
 * Farcaster authentication client plugin for Better Auth
 */
export const farcasterAuthClient = () => {
    return {
        id: "farcaster",
        getActions: ($fetch) => {
            return {
                /**
                 * Sign in with a Farcaster Quick Auth token
                 * @param data - Object containing the Farcaster Quick Auth token
                 * @param fetchOptions - Optional fetch configuration
                 * @returns The authenticated user and session
                 */
                signInWithFarcaster: async (
                    data: { token: string },
                    fetchOptions?: BetterFetchOption
                ): Promise<FetchResponse<FarcasterSignInResponse>> => {
                    const res = await $fetch<FarcasterSignInResponse>("/farcaster/sign-in", {
                        method: "POST",
                        body: data,
                        ...fetchOptions,
                    });
                    return res as FetchResponse<FarcasterSignInResponse>;
                },

                /**
                 * Link the current authenticated account to a Farcaster FID
                 * @param data - Object containing the Farcaster Quick Auth token
                 * @param fetchOptions - Optional fetch configuration
                 * @returns Success status and updated user
                 */
                linkFarcasterAccount: async (
                    data: { token: string },
                    fetchOptions?: BetterFetchOption
                ): Promise<FetchResponse<FarcasterLinkResponse>> => {
                    const res = await $fetch<FarcasterLinkResponse>("/farcaster/link", {
                        method: "POST",
                        body: data,
                        ...fetchOptions,
                    });
                    return res as FetchResponse<FarcasterLinkResponse>;
                },

                /**
                 * Unlink Farcaster from the current authenticated account
                 * @param fetchOptions - Optional fetch configuration
                 * @returns Success status and updated user
                 */
                unlinkFarcasterAccount: async (
                    fetchOptions?: BetterFetchOption
                ): Promise<FetchResponse<FarcasterLinkResponse>> => {
                    const res = await $fetch<FarcasterLinkResponse>("/farcaster/unlink", {
                        method: "POST",
                        ...fetchOptions,
                    });
                    return res as FetchResponse<FarcasterLinkResponse>;
                },

                /**
                 * Get the Farcaster profile for the current authenticated user
                 * @param fetchOptions - Optional fetch configuration
                 * @returns The user's Farcaster FID and profile data
                 */
                getFarcasterProfile: async (
                    fetchOptions?: BetterFetchOption
                ): Promise<FetchResponse<FarcasterProfileResponse>> => {
                    const res = await $fetch<FarcasterProfileResponse>("/farcaster/profile", {
                        method: "GET",
                        ...fetchOptions,
                    });
                    return res as FetchResponse<FarcasterProfileResponse>;
                },
            };
        },
        // Define path methods explicitly for clarity
        pathMethods: {
            "/farcaster/sign-in": "POST",
            "/farcaster/link": "POST",
            "/farcaster/unlink": "POST",
            "/farcaster/profile": "GET",
        },
    } satisfies BetterAuthClientPlugin;
};

// Export types for consumers
export type FarcasterAuthClient = {
    signInWithFarcaster: (
        data: { token: string },
        fetchOptions?: BetterFetchOption
    ) => Promise<FetchResponse<FarcasterSignInResponse>>;
    linkFarcasterAccount: (
        data: { token: string },
        fetchOptions?: BetterFetchOption
    ) => Promise<FetchResponse<FarcasterLinkResponse>>;
    unlinkFarcasterAccount: (
        fetchOptions?: BetterFetchOption
    ) => Promise<FetchResponse<FarcasterLinkResponse>>;
    getFarcasterProfile: (
        fetchOptions?: BetterFetchOption
    ) => Promise<FetchResponse<FarcasterProfileResponse>>;
};