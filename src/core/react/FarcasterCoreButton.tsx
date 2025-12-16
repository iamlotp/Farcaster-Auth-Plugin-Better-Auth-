import React, { useState } from "react";
import { useFarcasterSIWF, type UseFarcasterSIWFOptions } from "./useFarcasterSIWF";
import type { FarcasterUser } from "../../types";

/**
 * Props for the FarcasterCoreButton component
 */
export interface FarcasterCoreButtonProps {
    /**
     * Options for the useFarcasterSIWF hook
     */
    signInOptions: UseFarcasterSIWFOptions;
    /**
     * Enable debug mode - logs session data to console when clicked
     * @default false
     */
    debug?: boolean;
    /**
     * Custom class name for the button
     */
    className?: string;
    /**
     * Custom styles for the button
     */
    style?: React.CSSProperties;
    /**
     * Show user avatar when authenticated
     * @default true
     */
    showAvatar?: boolean;
    /**
     * Custom sign in text
     * @default "Sign in with Farcaster"
     */
    signInText?: string;
    /**
     * Custom sign out text
     * @default "Sign out"
     */
    signOutText?: string;
    /**
     * Custom loading text
     * @default "Loading..."
     */
    loadingText?: string;
    /**
     * Custom waiting for approval text
     * @default "Waiting for approval..."
     */
    waitingText?: string;
    /**
     * Custom cancel text
     * @default "Cancel"
     */
    cancelText?: string;
    /**
     * Render custom QR code component
     * If not provided, displays a link to the channel URL
     */
    renderQRCode?: (url: string) => React.ReactNode;
    /**
     * Show inline QR code/link when waiting
     * @default false (shows modal-like overlay)
     */
    inlineQR?: boolean;
}

/**
 * Default button styles matching Farcaster brand
 */
const defaultStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: 600,
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: "200px",
};

const signInStyles: React.CSSProperties = {
    ...defaultStyles,
    backgroundColor: "#8B5CF6",
    color: "#FFFFFF",
};

const signOutStyles: React.CSSProperties = {
    ...defaultStyles,
    backgroundColor: "#1F1F23",
    color: "#FFFFFF",
};

const cancelStyles: React.CSSProperties = {
    ...defaultStyles,
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
};

const disabledStyles: React.CSSProperties = {
    opacity: 0.6,
    cursor: "not-allowed",
};

const avatarStyles: React.CSSProperties = {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    objectFit: "cover",
};

const containerStyles: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
};

const qrContainerStyles: React.CSSProperties = {
    padding: "24px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
};

const linkStyles: React.CSSProperties = {
    color: "#8B5CF6",
    textDecoration: "none",
    fontWeight: 500,
};

/**
 * Farcaster logo SVG component
 */
const FarcasterLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"
            fill="currentColor"
        />
        <path
            d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"
            fill="currentColor"
        />
        <path
            d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"
            fill="currentColor"
        />
    </svg>
);

/**
 * Pre-styled Farcaster sign-in/sign-out button for Core (SIWF) context
 * 
 * Handles the full OAuth-like flow including QR code display for user approval.
 * 
 * @example Basic usage:
 * ```tsx
 * import { FarcasterCoreButton } from "better-auth-farcaster-plugin/core/react";
 * import { authClient } from "./lib/auth-client";
 * 
 * function App() {
 *   return (
 *     <FarcasterCoreButton
 *       signInOptions={{ authClient }}
 *     />
 *   );
 * }
 * ```
 * 
 * @example With debug mode and custom QR:
 * ```tsx
 * import QRCode from "react-qr-code";
 * 
 * <FarcasterCoreButton
 *   signInOptions={{ authClient }}
 *   debug={true}
 *   renderQRCode={(url) => <QRCode value={url} size={200} />}
 * />
 * ```
 */
export function FarcasterCoreButton({
    signInOptions,
    debug = false,
    className,
    style,
    showAvatar = true,
    signInText = "Sign in with Farcaster",
    signOutText = "Sign out",
    loadingText = "Loading...",
    waitingText = "Waiting for approval...",
    cancelText = "Cancel",
    renderQRCode,
    inlineQR = false,
}: FarcasterCoreButtonProps): React.ReactElement {
    const {
        createChannel,
        cancel,
        signOut,
        channelUrl,
        isCreatingChannel,
        isPolling,
        isVerifying,
        isSigningOut,
        isCheckingSession,
        user,
        session,
        isAuthenticated,
    } = useFarcasterSIWF(signInOptions);

    const handleClick = async () => {
        if (debug) {
            console.group("🟣 Farcaster Core Auth Debug");
            console.log("Authenticated:", isAuthenticated);
            console.log("User:", user);
            console.log("Session:", session);
            console.log("Channel URL:", channelUrl);
            console.log("Is Polling:", isPolling);
            console.log("Is Verifying:", isVerifying);
            console.log("Checking Session:", isCheckingSession);
            console.groupEnd();
        }

        if (isAuthenticated) {
            await signOut();
        } else if (!channelUrl) {
            await createChannel();
        }
    };

    const handleCancel = () => {
        if (debug) {
            console.log("🟣 Farcaster: Sign-in cancelled");
        }
        cancel();
    };

    const isLoading = isCreatingChannel || isVerifying;
    const isDisabled = isLoading || isSigningOut || isCheckingSession;

    const getButtonText = (): string => {
        if (isCheckingSession) return loadingText;
        if (isCreatingChannel) return "Creating channel...";
        if (isVerifying) return "Verifying...";
        if (isSigningOut) return "Signing out...";
        if (isAuthenticated) return signOutText;
        return signInText;
    };

    // Show QR code / waiting state
    if (channelUrl && isPolling) {
        return (
            <div style={containerStyles}>
                <div style={qrContainerStyles}>
                    {renderQRCode ? (
                        renderQRCode(channelUrl)
                    ) : (
                        <>
                            <FarcasterLogo size={48} />
                            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                                {waitingText}
                            </p>
                            <a
                                href={channelUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={linkStyles}
                            >
                                Open in Farcaster app →
                            </a>
                        </>
                    )}
                </div>
                <button
                    onClick={handleCancel}
                    className={className}
                    style={{ ...cancelStyles, ...style }}
                    type="button"
                >
                    {cancelText}
                </button>
            </div>
        );
    }

    const buttonStyle: React.CSSProperties = {
        ...(isAuthenticated ? signOutStyles : signInStyles),
        ...(isDisabled ? disabledStyles : {}),
        ...style,
    };

    return (
        <button
            onClick={handleClick}
            disabled={isDisabled}
            className={className}
            style={buttonStyle}
            type="button"
        >
            {isAuthenticated && showAvatar && user?.image ? (
                <img
                    src={user.image}
                    alt={user.name || "User avatar"}
                    style={avatarStyles}
                />
            ) : (
                <FarcasterLogo size={20} />
            )}
            <span>{getButtonText()}</span>
        </button>
    );
}
