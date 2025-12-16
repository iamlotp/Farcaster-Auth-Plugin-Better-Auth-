# Farcaster Plugin for Better-Auth

## 🗒️ Description
A community-made plugin that allows you to authenticate users via Farcaster. This plugin provides two authentication flows:

1. **Miniapp Flow** - Uses [Farcaster Quick Auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth) for JWT verification in Farcaster miniapp/frame context
2. **Core Flow** - Uses [Sign In With Farcaster](https://docs.farcaster.xyz/developers/guides/auth-kit) (SIWF) for OAuth-like authentication on regular web pages

**Features:**
- 🔐 Quick Auth sign-in for miniapps
- 🌐 SIWF (OAuth-like) sign-in for web apps
- 🔗 Link/unlink Farcaster accounts to existing users
- ⚛️ Optional React hooks with automatic session management
- 📊 Built-in rate limiting
- 🎯 Full TypeScript support with typed errors
- 🔄 Automatic session restoration and expiration handling

## ⚙️ Setup

### Installation

```bash
npm install better-auth-farcaster-plugin
# or
pnpm add better-auth-farcaster-plugin
```

### Peer Dependencies

**Required:**
- `better-auth` (>=1.2.0)
- `zod` (>=3.0.0)

**Optional (for Miniapp flow):**
- `@farcaster/quick-auth` (>=0.0.8)

**Optional (for Core/SIWF flow):**
- `@farcaster/auth-client` (>=0.1.0)
- `viem` (>=2.0.0)

**Optional (for React hooks):**
- `react` (>=17.0.0)

## 📱 Miniapp Flow (Quick Auth)

For Farcaster miniapps and frames where User context is available.

### Server Setup

```typescript
// auth.ts
import { betterAuth } from "better-auth";
import { farcasterAuth } from "better-auth-farcaster-plugin";
// Or explicitly: import { farcasterMiniappAuth } from "better-auth-farcaster-plugin/miniapp";

export const auth = betterAuth({
    plugins: [
        farcasterAuth({
            domain: process.env.BETTER_AUTH_URL || "https://example.com",
        }),
    ],
});
```

### Client Setup

```typescript
// auth-client.ts
import { createAuthClient } from "better-auth/react";
import { farcasterAuthClient } from "better-auth-farcaster-plugin/client";
// Or explicitly: import { farcasterMiniappClient } from "better-auth-farcaster-plugin/miniapp/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    plugins: [farcasterAuthClient()],
});
```

### React Hooks (Miniapp)

```tsx
import { useFarcasterSignIn } from "better-auth-farcaster-plugin/react";
// Or: import { useFarcasterSignIn } from "better-auth-farcaster-plugin/miniapp/react";
import { authClient } from "./lib/auth-client";
import sdk from "@farcaster/frame-sdk";

function SignInButton() {
    const { signIn, signOut, isLoading, isAuthenticated, user } = useFarcasterSignIn({
        authClient,
        getToken: async () => {
            const result = await sdk.quickAuth.getToken();
            return result.token;
        },
        onSuccess: (response) => console.log("Signed in!", response.user),
    });

    if (isAuthenticated) {
        return (
            <div>
                <p>Welcome, {user?.name}!</p>
                <button onClick={signOut}>Sign Out</button>
            </div>
        );
    }

    return (
        <button onClick={signIn} disabled={isLoading}>
            Sign in with Farcaster
        </button>
    );
}
```

---

## 🌐 Core Flow (SIWF - OAuth-like)

For regular web apps where users authenticate via QR code or deeplink.

### Install Additional Dependencies

```bash
pnpm add @farcaster/auth-client viem
```

### Server Setup

```typescript
// auth.ts
import { betterAuth } from "better-auth";
import { farcasterCoreAuth } from "better-auth-farcaster-plugin/core";

export const auth = betterAuth({
    plugins: [
        farcasterCoreAuth({
            domain: "example.com",
            siweUri: "https://example.com/login",
            // Optional: custom relay
            // relay: "https://relay.farcaster.xyz",
        }),
    ],
});
```

### Client Setup

```typescript
// auth-client.ts
import { createAuthClient } from "better-auth/react";
import { farcasterCoreClient } from "better-auth-farcaster-plugin/core/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    plugins: [farcasterCoreClient()],
});
```

### React Hooks (Core)

```tsx
import { useFarcasterSIWF } from "better-auth-farcaster-plugin/core/react";
import { authClient } from "./lib/auth-client";
import QRCode from "react-qr-code";

function SignInWithFarcaster() {
    const {
        createChannel,
        cancel,
        channelUrl,
        isLoading,
        isPolling,
        isAuthenticated,
        user,
    } = useFarcasterSIWF({
        authClient,
        onSuccess: (response) => console.log("Signed in!", response.user),
    });

    if (isAuthenticated) {
        return <p>Welcome, {user?.name}!</p>;
    }

    if (channelUrl) {
        return (
            <div>
                <QRCode value={channelUrl} />
                <p>Scan with Farcaster app or <a href={channelUrl}>click here</a></p>
                {isPolling && <p>Waiting for approval...</p>}
                <button onClick={cancel}>Cancel</button>
            </div>
        );
    }

    return (
        <button onClick={createChannel} disabled={isLoading}>
            Sign in with Farcaster
        </button>
    );
}
```

---

## 🎨 Pre-styled Button Components

Both flows include ready-to-use button components with Farcaster branding, automatic state management, and optional debug mode.

### Miniapp Button

```tsx
import { FarcasterButton } from "better-auth-farcaster-plugin/miniapp/react";
import { authClient } from "./lib/auth-client";
import sdk from "@farcaster/frame-sdk";

function App() {
    return (
        <FarcasterButton
            signInOptions={{
                authClient,
                getToken: async () => {
                    const result = await sdk.quickAuth.getToken();
                    return result.token;
                },
            }}
            debug={true} // Logs session data to console
        />
    );
}
```

### Core Button (SIWF)

```tsx
import { FarcasterCoreButton } from "better-auth-farcaster-plugin/core/react";
import { authClient } from "./lib/auth-client";
import QRCode from "react-qr-code"; // optional

function App() {
    return (
        <FarcasterCoreButton
            signInOptions={{ authClient }}
            debug={true}
            renderQRCode={(url) => <QRCode value={url} size={200} />}
        />
    );
}
```

### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `signInOptions` | object | required | Hook options (authClient, callbacks) |
| `debug` | boolean | `false` | Log session data to console when clicked |
| `className` | string | - | Custom CSS class |
| `style` | CSSProperties | - | Inline styles |
| `showAvatar` | boolean | `true` | Show user avatar when authenticated |
| `signInText` | string | `"Sign in with Farcaster"` | Sign in button text |
| `signOutText` | string | `"Sign out"` | Sign out button text |
| `loadingText` | string | `"Loading..."` | Loading state text |

**Core-specific props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `waitingText` | string | `"Waiting for approval..."` | Text during polling |
| `cancelText` | string | `"Cancel"` | Cancel button text |
| `renderQRCode` | `(url: string) => ReactNode` | - | Custom QR code renderer |

---

## 📦 Import Paths

| Path | Description |
|------|-------------|
| `better-auth-farcaster-plugin` | Server plugin (defaults to miniapp) |
| `better-auth-farcaster-plugin/client` | Client plugin (defaults to miniapp) |
| `better-auth-farcaster-plugin/react` | React hooks (defaults to miniapp) |
| `better-auth-farcaster-plugin/miniapp` | Miniapp server plugin |
| `better-auth-farcaster-plugin/miniapp/client` | Miniapp client plugin |
| `better-auth-farcaster-plugin/miniapp/react` | Miniapp React hooks |
| `better-auth-farcaster-plugin/core` | Core SIWF server plugin |
| `better-auth-farcaster-plugin/core/client` | Core SIWF client plugin |
| `better-auth-farcaster-plugin/core/react` | Core SIWF React hooks |

---

## ⚛️ React Context Providers

Both flows provide context providers for easier state management:

### Miniapp Provider

```tsx
import { FarcasterProvider, useFarcaster } from "better-auth-farcaster-plugin/miniapp/react";

function App() {
    return (
        <FarcasterProvider
            signInOptions={{ authClient, getToken }}
            linkOptions={{ onLinkSuccess: (r) => console.log("Linked!") }}
        >
            <YourApp />
        </FarcasterProvider>
    );
}

function YourApp() {
    const { signIn, link } = useFarcaster();
    // ...
}
```

### Core Provider

```tsx
import { FarcasterCoreProvider, useFarcasterCore } from "better-auth-farcaster-plugin/core/react";

function App() {
    return (
        <FarcasterCoreProvider signInOptions={{ authClient }}>
            <YourApp />
        </FarcasterCoreProvider>
    );
}

function YourApp() {
    const { signIn, link } = useFarcasterCore();
    // signIn.createChannel(), signIn.channelUrl, etc.
}
```

---

## 📚 API Reference

### Server Endpoints

**Miniapp Flow** (plugin ID: `farcaster-miniapp`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/farcaster-miniapp/sign-in` | POST | Sign in with Quick Auth token |
| `/farcaster-miniapp/link` | POST | Link Farcaster to existing account |
| `/farcaster-miniapp/unlink` | POST | Unlink Farcaster from account |
| `/farcaster-miniapp/profile` | GET | Get Farcaster profile |

**Core Flow** (plugin ID: `farcaster`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/farcaster/create-channel` | POST | Create SIWF channel (returns QR URL) |
| `/farcaster/channel-status` | POST | Poll channel status |
| `/farcaster/verify-signature` | POST | Verify signature and create session |
| `/farcaster/link` | POST | Link Farcaster to existing account |
| `/farcaster/unlink` | POST | Unlink Farcaster from account |
| `/farcaster/profile` | GET | Get Farcaster profile |

### Error Codes

```typescript
// Miniapp errors
type FarcasterAuthErrorCode =
    | 'INVALID_TOKEN' | 'SESSION_EXPIRED' | 'RATE_LIMITED'
    | 'NETWORK_ERROR' | 'TOKEN_FETCH_FAILED' | 'UNKNOWN';

// Core errors
type FarcasterCoreAuthErrorCode =
    | 'INVALID_SIGNATURE' | 'CHANNEL_EXPIRED' | 'CHANNEL_TIMEOUT'
    | 'SESSION_EXPIRED' | 'RATE_LIMITED' | 'NETWORK_ERROR'
    | 'POLLING_FAILED' | 'FID_MISMATCH' | 'UNKNOWN';
```

---

## 🔒 Rate Limiting

**Miniapp Endpoints:**

| Endpoint | Limit |
|----------|-------|
| `/farcaster-miniapp/sign-in` | 10/min |
| `/farcaster-miniapp/link` | 5/min |

**Core Endpoints:**

| Endpoint | Limit |
|----------|-------|
| `/farcaster/create-channel` | 10/min |
| `/farcaster/verify-siwf` | 10/min |
| `/farcaster/channel-status` | 60/min |
| `/farcaster/link` | 5/min |

---

## 🔄 Migration from v3.x to v4.x

### ⚠️ Breaking Changes in v4.0.0

The **Miniapp plugin** has been renamed to avoid conflicts when using both plugins together:

| v3.x | v4.x |
|------|------|
| Plugin ID: `farcaster` | Plugin ID: `farcaster-miniapp` |
| Endpoints: `/farcaster/*` | Endpoints: `/farcaster-miniapp/*` |
| Client: `authClient.farcaster.*` | Client: `authClient.farcasterMiniapp.*` |

### Client Method Updates (Miniapp)

```typescript
// v3.x
authClient.farcaster.signIn({ token })
authClient.farcaster.link({ token })
authClient.farcaster.unlink()
authClient.farcaster.profile()

// v4.x
authClient.farcasterMiniapp.signIn({ token })
authClient.farcasterMiniapp.link({ token })
authClient.farcasterMiniapp.unlink()
authClient.farcasterMiniapp.profile()
```

### Using Both Plugins Together

You can now use both Miniapp and Core plugins without conflicts:

```typescript
// Server
import { farcasterMiniappAuth } from "better-auth-farcaster-plugin/miniapp";
import { farcasterCoreAuth } from "better-auth-farcaster-plugin/core";

export const auth = betterAuth({
    plugins: [
        farcasterMiniappAuth({ domain: "example.com" }),
        farcasterCoreAuth({ domain: "example.com", siweUri: "https://example.com/login" }),
    ],
});

// Client
import { farcasterMiniappClient } from "better-auth-farcaster-plugin/miniapp/client";
import { farcasterCoreClient } from "better-auth-farcaster-plugin/core/client";

export const authClient = createAuthClient({
    plugins: [farcasterMiniappClient(), farcasterCoreClient()],
});

// Use both
authClient.farcasterMiniapp.signIn({ token });  // Miniapp flow
authClient.farcaster.createChannel();            // Core SIWF flow
```

### Import Compatibility

Server imports still work (backward compatible):

```typescript
import { farcasterAuth } from "better-auth-farcaster-plugin"; // Still works
```

**However**, client code needs to be updated to use `farcasterMiniapp.*` methods.

---

## 🔗 Dependencies

- [better-auth](https://www.better-auth.com/)
- [@farcaster/quick-auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth) (miniapp)
- [@farcaster/auth-client](https://docs.farcaster.xyz/developers/guides/auth-client) (core, optional)
- [viem](https://viem.sh/) (core, optional)
- [zod](https://zod.dev/)

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.