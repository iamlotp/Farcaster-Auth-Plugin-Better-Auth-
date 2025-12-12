import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import {
    useFarcasterSignIn,
    type UseFarcasterSignInOptions,
    type UseFarcasterSignInReturn,
} from "./useFarcasterSignIn";
import {
    useFarcasterLink,
    type UseFarcasterLinkOptions,
    type UseFarcasterLinkReturn,
} from "./useFarcasterLink";

/**
 * Combined return type for the Farcaster context
 * Includes all values from both useFarcasterSignIn and useFarcasterLink hooks
 */
export interface FarcasterContextValue {
    /**
     * All values and methods from the useFarcasterSignIn hook
     */
    signIn: UseFarcasterSignInReturn;
    /**
     * All values and methods from the useFarcasterLink hook
     */
    link: UseFarcasterLinkReturn;
}

/**
 * Options for the FarcasterProvider component
 */
export interface FarcasterProviderOptions {
    /**
     * Options for the useFarcasterSignIn hook
     */
    signInOptions: UseFarcasterSignInOptions;
    /**
     * Options for the useFarcasterLink hook
     * If not provided, link functionality will use the same authClient and getToken
     * as signInOptions, but link callbacks will not be configured
     */
    linkOptions?: Partial<UseFarcasterLinkOptions>;
}

/**
 * Props for the FarcasterProvider component
 */
export interface FarcasterProviderProps extends FarcasterProviderOptions {
    /**
     * Child components that will have access to the Farcaster context
     */
    children: ReactNode;
}

// Create the context with undefined as default (will throw if used outside provider)
const FarcasterContext = createContext<FarcasterContextValue | undefined>(undefined);

/**
 * Provider component that wraps your application and provides Farcaster authentication context
 *
 * This provider initializes both useFarcasterSignIn and useFarcasterLink hooks
 * and makes their values available to all child components via the useFarcaster hook.
 *
 * @example Basic usage:
 * ```tsx
 * import { FarcasterProvider, useFarcaster } from "better-auth-farcaster-plugin/react";
 * import { authClient } from "./lib/auth-client";
 * import sdk from "@farcaster/frame-sdk";
 *
 * const getToken = async () => {
 *   const result = await sdk.quickAuth.getToken();
 *   return result.token;
 * };
 *
 * function App() {
 *   return (
 *     <FarcasterProvider
 *       signInOptions={{
 *         authClient,
 *         getToken,
 *         onSuccess: (response) => console.log("Signed in!", response.user),
 *         onError: (error) => console.error("Sign-in failed:", error.message),
 *       }}
 *       linkOptions={{
 *         onLinkSuccess: (response) => console.log("Linked!", response.user),
 *         onUnlinkSuccess: () => console.log("Unlinked!"),
 *       }}
 *     >
 *       <YourApp />
 *     </FarcasterProvider>
 *   );
 * }
 *
 * function YourApp() {
 *   const { signIn, link } = useFarcaster();
 *
 *   if (signIn.isCheckingSession) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   if (signIn.isAuthenticated) {
 *     return (
 *       <div>
 *         <p>Welcome, {signIn.user?.name}!</p>
 *         <button onClick={signIn.signOut} disabled={signIn.isSigningOut}>
 *           {signIn.isSigningOut ? "Signing out..." : "Sign Out"}
 *         </button>
 *         {!signIn.user?.fid && (
 *           <button onClick={link.link} disabled={link.isLoading}>
 *             {link.isLoading ? "Linking..." : "Link Farcaster"}
 *           </button>
 *         )}
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <button onClick={signIn.signIn} disabled={signIn.isLoading}>
 *       {signIn.isLoading ? "Signing in..." : "Sign in with Farcaster"}
 *     </button>
 *   );
 * }
 * ```
 */
export function FarcasterProvider({
    children,
    signInOptions,
    linkOptions = {},
}: FarcasterProviderProps): React.ReactElement {
    // Initialize the sign-in hook
    const signInResult = useFarcasterSignIn(signInOptions);

    // Merge link options with defaults from signInOptions
    const fullLinkOptions: UseFarcasterLinkOptions = {
        authClient: linkOptions.authClient || (signInOptions.authClient as any),
        getToken: linkOptions.getToken || signInOptions.getToken,
        onLinkSuccess: linkOptions.onLinkSuccess,
        onUnlinkSuccess: linkOptions.onUnlinkSuccess,
        onError: linkOptions.onError,
    };

    // Initialize the link hook
    const linkResult = useFarcasterLink(fullLinkOptions);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo<FarcasterContextValue>(
        () => ({
            signIn: signInResult,
            link: linkResult,
        }),
        [signInResult, linkResult]
    );

    return (
        <FarcasterContext.Provider value={contextValue}>
            {children}
        </FarcasterContext.Provider>
    );
}

/**
 * Hook to access Farcaster authentication context
 *
 * Must be used within a FarcasterProvider. Returns all values from both
 * useFarcasterSignIn and useFarcasterLink hooks.
 *
 * @throws Error if used outside of FarcasterProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { signIn, link } = useFarcaster();
 *
 *   return (
 *     <div>
 *       {signIn.isAuthenticated ? (
 *         <>
 *           <p>Welcome, {signIn.user?.name}!</p>
 *           <button onClick={signIn.signOut}>Sign Out</button>
 *         </>
 *       ) : (
 *         <button onClick={signIn.signIn} disabled={signIn.isLoading}>
 *           Sign in with Farcaster
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFarcaster(): FarcasterContextValue {
    const context = useContext(FarcasterContext);

    if (context === undefined) {
        throw new Error(
            "useFarcaster must be used within a FarcasterProvider. " +
            "Wrap your component tree with <FarcasterProvider>."
        );
    }

    return context;
}

/**
 * Hook to access only the sign-in related values from the Farcaster context
 *
 * This is a convenience hook that returns only the signIn portion of the context.
 * Useful when you only need sign-in functionality without link operations.
 *
 * @throws Error if used outside of FarcasterProvider
 *
 * @example
 * ```tsx
 * function SignInButton() {
 *   const { signIn, isLoading, isAuthenticated, user } = useFarcasterAuth();
 *
 *   if (isAuthenticated) {
 *     return <p>Welcome, {user?.name}!</p>;
 *   }
 *
 *   return (
 *     <button onClick={signIn} disabled={isLoading}>
 *       Sign in with Farcaster
 *     </button>
 *   );
 * }
 * ```
 */
export function useFarcasterAuth(): UseFarcasterSignInReturn {
    const { signIn } = useFarcaster();
    return signIn;
}

/**
 * Hook to access only the link-related values from the Farcaster context
 *
 * This is a convenience hook that returns only the link portion of the context.
 * Useful when you only need link/unlink functionality.
 *
 * @throws Error if used outside of FarcasterProvider
 *
 * @example
 * ```tsx
 * function LinkButton({ hasFarcaster }: { hasFarcaster: boolean }) {
 *   const { link, unlink, isLoading } = useFarcasterLinking();
 *
 *   if (hasFarcaster) {
 *     return (
 *       <button onClick={unlink} disabled={isLoading}>
 *         Unlink Farcaster
 *       </button>
 *     );
 *   }
 *
 *   return (
 *     <button onClick={link} disabled={isLoading}>
 *       Link Farcaster
 *     </button>
 *   );
 * }
 * ```
 */
export function useFarcasterLinking(): UseFarcasterLinkReturn {
    const { link } = useFarcaster();
    return link;
}
