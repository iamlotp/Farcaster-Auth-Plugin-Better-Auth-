import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import {
    useFarcasterSIWF,
    type UseFarcasterSIWFOptions,
    type UseFarcasterSIWFReturn,
} from "./useFarcasterSIWF";
import {
    useFarcasterCoreLink,
    type UseFarcasterCoreLinkOptions,
    type UseFarcasterCoreLinkReturn,
} from "./useFarcasterCoreLink";

/**
 * Combined return type for the Farcaster Core context
 */
export interface FarcasterCoreContextValue {
    /**
     * All values and methods from the useFarcasterSIWF hook
     */
    signIn: UseFarcasterSIWFReturn;
    /**
     * All values and methods from the useFarcasterCoreLink hook
     */
    link: UseFarcasterCoreLinkReturn;
}

/**
 * Options for the FarcasterCoreProvider component
 */
export interface FarcasterCoreProviderOptions {
    /**
     * Options for the useFarcasterSIWF hook
     */
    signInOptions: UseFarcasterSIWFOptions;
    /**
     * Options for the useFarcasterCoreLink hook
     */
    linkOptions?: Partial<UseFarcasterCoreLinkOptions>;
}

/**
 * Props for the FarcasterCoreProvider component
 */
export interface FarcasterCoreProviderProps extends FarcasterCoreProviderOptions {
    /**
     * Child components that will have access to the Farcaster Core context
     */
    children: ReactNode;
}

const FarcasterCoreContext = createContext<FarcasterCoreContextValue | undefined>(undefined);

/**
 * Provider component for Farcaster Core (SIWF) authentication context
 *
 * @example
 * ```tsx
 * import { FarcasterCoreProvider, useFarcasterCore } from "better-auth-farcaster-plugin/core/react";
 * import { authClient } from "./lib/auth-client";
 * import QRCode from "react-qr-code";
 *
 * function App() {
 *   return (
 *     <FarcasterCoreProvider
 *       signInOptions={{
 *         authClient,
 *         onSuccess: (response) => console.log("Signed in!", response.user),
 *       }}
 *     >
 *       <YourApp />
 *     </FarcasterCoreProvider>
 *   );
 * }
 *
 * function YourApp() {
 *   const { signIn } = useFarcasterCore();
 *
 *   if (signIn.isAuthenticated) {
 *     return <p>Welcome, {signIn.user?.name}!</p>;
 *   }
 *
 *   if (signIn.channelUrl) {
 *     return <QRCode value={signIn.channelUrl} />;
 *   }
 *
 *   return <button onClick={signIn.createChannel}>Sign in with Farcaster</button>;
 * }
 * ```
 */
export function FarcasterCoreProvider({
    children,
    signInOptions,
    linkOptions = {},
}: FarcasterCoreProviderProps): React.ReactElement {
    const signInResult = useFarcasterSIWF(signInOptions);

    const fullLinkOptions: UseFarcasterCoreLinkOptions = {
        authClient: linkOptions.authClient || (signInOptions.authClient as any),
        pollInterval: linkOptions.pollInterval,
        pollTimeout: linkOptions.pollTimeout,
        onLinkSuccess: linkOptions.onLinkSuccess,
        onUnlinkSuccess: linkOptions.onUnlinkSuccess,
        onError: linkOptions.onError,
    };

    const linkResult = useFarcasterCoreLink(fullLinkOptions);

    const contextValue = useMemo<FarcasterCoreContextValue>(
        () => ({
            signIn: signInResult,
            link: linkResult,
        }),
        [signInResult, linkResult]
    );

    return (
        <FarcasterCoreContext.Provider value={contextValue}>
            {children}
        </FarcasterCoreContext.Provider>
    );
}

/**
 * Hook to access Farcaster Core authentication context
 */
export function useFarcasterCore(): FarcasterCoreContextValue {
    const context = useContext(FarcasterCoreContext);

    if (context === undefined) {
        throw new Error(
            "useFarcasterCore must be used within a FarcasterCoreProvider. " +
            "Wrap your component tree with <FarcasterCoreProvider>."
        );
    }

    return context;
}

/**
 * Hook to access only the sign-in values from the Core context
 */
export function useFarcasterCoreSIWF(): UseFarcasterSIWFReturn {
    const { signIn } = useFarcasterCore();
    return signIn;
}

/**
 * Hook to access only the link values from the Core context
 */
export function useFarcasterCoreLinking(): UseFarcasterCoreLinkReturn {
    const { link } = useFarcasterCore();
    return link;
}
