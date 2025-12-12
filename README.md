# Farcaster Plugin for Better-Auth

## 🗒️ Description
A community-made plugin that allows you to authenticate users via [Farcaster Quick Auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth). This plugin provides a seamless integration with Better Auth to support Farcaster-based authentication in your applications.

**Features:**
- 🔐 Farcaster Quick Auth sign-in
- 🔗 Link/unlink Farcaster accounts to existing users
- ⚛️ Optional React hooks with automatic session management
- 📊 Built-in rate limiting
- 🎯 Full TypeScript support with typed errors
- 🔄 Automatic session restoration and expiration handling

## ⚙️ Setup

### Installation

Install the plugin using your preferred package manager:

```bash
npm install better-auth-farcaster-plugin
# or
yarn add better-auth-farcaster-plugin
# or
pnpm add better-auth-farcaster-plugin
# or
bun add better-auth-farcaster-plugin
```

### Peer Dependencies

This plugin requires the following peer dependencies:

- `better-auth` (>=1.2.0)
- `zod` (>=3.0.0)
- `react` (>=17.0.0) - *Optional, only needed for React hooks*

## 📒 How To Use

### 1. Server Setup

Add `farcasterAuth` as a plugin to your Better Auth configuration:

```typescript
// auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { farcasterAuth } from "better-auth-farcaster-plugin";
import { prisma } from "./prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite", // or your database provider
    }),
    baseURL: process.env.BETTER_AUTH_URL || "https://example.com",
    trustedOrigins: ["https://example.com"],
    plugins: [
        farcasterAuth({
            domain: process.env.BETTER_AUTH_URL || "https://example.com",
        }),
    ],
});
```

#### Configuration Options

```typescript
farcasterAuth({
    // Required: Your application domain (used for JWT verification)
    domain: "https://example.com",
    
    // Optional: Custom function to resolve additional user data from Farcaster
    resolveUserData: async (fid: number) => {
        // Fetch additional data from Neynar, Snapchain, or your database
        const userData = await fetchFarcasterUserData(fid);
        return {
            name: userData.displayName,
            email: userData.email,
            image: userData.pfpUrl,
        };
    },
    
    // Optional: Cookie configuration
    cookieOptions: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
        path: "/",
    },
});
```

### 2. Client Setup

Add `farcasterAuthClient` as a plugin to your auth client:

```typescript
// auth-client.ts
import { createAuthClient } from "better-auth/react";
import { farcasterAuthClient } from "better-auth-farcaster-plugin/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://example.com",
    plugins: [
        farcasterAuthClient(),
    ],
});
```

### 3. Database Setup

Generate and apply the schema:

```bash
# Generate the Better Auth schema
npx @better-auth/cli@latest generate

# For Prisma users:
npx prisma generate
npx prisma migrate dev --name add_farcaster_fid
```

This will add a `fid` column to the `user` table.

### 4. Environment Variables

```dotenv
BETTER_AUTH_URL="https://example.com"
```

## 🔐 Authentication Flow

This plugin uses [Farcaster Quick Auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth) for authentication. The flow is simple:

### Sign In with Farcaster

1. **Frontend**: Get a Quick Auth token from the Farcaster SDK
2. **Backend**: Verify the token and create a session

```typescript
// In your Farcaster Mini App frontend
import { sdk } from "@farcaster/miniapp-sdk";
import { authClient } from "~/lib/auth/auth-client";

async function signInWithFarcaster() {
    // Get token from Farcaster SDK
    const { token } = await sdk.quickAuth.getToken();
    
    // Sign in with the token
    const { data, error } = await authClient.farcaster.signIn({ token });
    
    if (error) {
        console.error("Sign in failed:", error.message);
        return;
    }
    
    console.log("Signed in as:", data.user);
}
```

## ⚛️ React Hooks (Optional)

For React applications, we provide convenient hooks that handle loading states, errors, and the full authentication flow. Import from `better-auth-farcaster-plugin/react`.

### `FarcasterProvider` & `useFarcaster`

For applications that need to access Farcaster authentication state across multiple components, use the `FarcasterProvider` context provider. This initializes both sign-in and link hooks and makes their values available throughout your component tree.

```tsx
'use client';
import { 
    FarcasterProvider, 
    useFarcaster,
    useFarcasterAuth,
    useFarcasterLinking 
} from "better-auth-farcaster-plugin/react";
import { authClient } from "~/lib/auth/auth-client";
import sdk from "@farcaster/frame-sdk";

const getToken = async () => {
    const result = await sdk.quickAuth.getToken();
    return result.token;
};

// Wrap your app with the provider
function App() {
    return (
        <FarcasterProvider
            signInOptions={{
                authClient,
                getToken,
                onSuccess: (response) => console.log("Signed in!", response.user),
                onSessionFound: (data) => console.log("Session restored!", data.user),
                onError: (error) => console.error("Error:", error.message),
            }}
            linkOptions={{
                onLinkSuccess: (response) => console.log("Linked!", response.user),
                onUnlinkSuccess: () => console.log("Unlinked!"),
            }}
        >
            <YourApp />
        </FarcasterProvider>
    );
}

// Access both signIn and link in any child component
function ProfilePage() {
    const { signIn, link } = useFarcaster();

    if (signIn.isCheckingSession) {
        return <div>Loading...</div>;
    }

    if (signIn.isAuthenticated) {
        return (
            <div>
                <p>Welcome, {signIn.user?.name}!</p>
                <button onClick={signIn.signOut} disabled={signIn.isSigningOut}>
                    {signIn.isSigningOut ? "Signing out..." : "Sign Out"}
                </button>
                {!signIn.user?.fid && (
                    <button onClick={link.link} disabled={link.isLoading}>
                        {link.isLoading ? "Linking..." : "Link Farcaster"}
                    </button>
                )}
            </div>
        );
    }

    return (
        <button onClick={signIn.signIn} disabled={signIn.isLoading}>
            {signIn.isLoading ? "Signing in..." : "Sign in with Farcaster"}
        </button>
    );
}

// Or use convenience hooks for specific functionality
function SignInButton() {
    // Only get sign-in values
    const { signIn, isLoading, isAuthenticated, user } = useFarcasterAuth();
    // ...
}

function LinkButton() {
    // Only get link values
    const { link, unlink, isLoading } = useFarcasterLinking();
    // ...
}
```

#### `FarcasterProvider` Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `signInOptions` | `UseFarcasterSignInOptions` | ✅ | Options for the sign-in hook (authClient, getToken, callbacks) |
| `linkOptions` | `Partial<UseFarcasterLinkOptions>` | ❌ | Options for the link hook (inherits authClient/getToken from signInOptions if not provided) |
| `children` | `ReactNode` | ✅ | Child components that will have access to the context |

#### Context Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useFarcaster()` | `{ signIn, link }` | Returns both signIn and link context values |
| `useFarcasterAuth()` | `UseFarcasterSignInReturn` | Convenience hook for sign-in only |
| `useFarcasterLinking()` | `UseFarcasterLinkReturn` | Convenience hook for link only |

### `useFarcasterSignIn`

A hook for handling Farcaster sign-in with **automatic session management**. The hook automatically checks for existing sessions on mount and only triggers the sign-in flow if no valid session exists.

**Features:**
- 🔄 Automatic session restoration on mount
- 💾 Checks for saved sessions in cookies
- ✅ Only authenticates when necessary
- 📊 Exposes both `user` and `session` data
- 🚪 Built-in `signOut` function
- ⚠️ Session expiration detection
- 🎯 Typed errors with error codes

```tsx
'use client';
import { useFarcasterSignIn } from "better-auth-farcaster-plugin/react";
import { authClient } from "~/lib/auth/auth-client";
import sdk from "@farcaster/frame-sdk";

export function SignInButton() {
    const { 
        signIn,
        signOut,
        isLoading,
        isSigningOut,
        isCheckingSession,
        error, 
        user, 
        session,
        isAuthenticated,
        refreshSession 
    } = useFarcasterSignIn({
        authClient,  // Pass the full auth client
        getToken: async () => {
            const result = await sdk.quickAuth.getToken();
            return result.token;
        },
        onSuccess: (response) => {
            console.log("Signed in!", response.user);
            sdk.actions.ready();
        },
        onSessionFound: (data) => {
            console.log("Session restored!", data.user);
            sdk.actions.ready();
        },
        onSignOut: () => {
            console.log("User signed out");
        },
        onSessionExpired: () => {
            console.log("Session expired - please sign in again");
        },
        onError: (error) => {
            // error is a FarcasterAuthError with a code property
            console.error("Error:", error.code, error.message);
        },
    });

    if (isCheckingSession) {
        return <div>Loading...</div>;
    }

    if (isAuthenticated) {
        return (
            <div>
                <p>Welcome, {user?.name}!</p>
                <p>Session expires: {new Date(session?.expiresAt).toLocaleString()}</p>
                <button onClick={signOut} disabled={isSigningOut}>
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                </button>
            </div>
        );
    }

    return (
        <div>
            <button onClick={signIn} disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in with Farcaster"}
            </button>
            {error && <p className="text-red-500">{error.message}</p>}
        </div>
    );
}
```

#### `useFarcasterSignIn` Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `authClient` | `BetterAuthClientWithFarcaster` | ✅ | - | The full Better Auth client with Farcaster plugin |
| `getToken` | `() => Promise<string>` | ✅ | - | Function that returns a Farcaster Quick Auth token |
| `autoCheckSession` | `boolean` | ❌ | `true` | Whether to automatically check for existing session on mount |
| `onSuccess` | `(response) => void` | ❌ | - | Callback fired on successful sign-in |
| `onSessionFound` | `(data) => void` | ❌ | - | Callback fired when an existing session is found |
| `onSignOut` | `() => void` | ❌ | - | Callback fired when sign-out completes |
| `onSessionExpired` | `() => void` | ❌ | - | Callback fired when session expires or becomes invalid |
| `onError` | `(error: FarcasterAuthError) => void` | ❌ | - | Callback fired on error with typed error |

#### `useFarcasterSignIn` Return Values

| Value | Type | Description |
|-------|------|-------------|
| `signIn` | `() => Promise<void>` | Function to initiate sign-in (skips if already authenticated) |
| `signOut` | `() => Promise<void>` | Function to sign out and clear local state |
| `isLoading` | `boolean` | Whether sign-in is in progress |
| `isSigningOut` | `boolean` | Whether sign-out is in progress |
| `isCheckingSession` | `boolean` | Whether session validation is in progress (on mount) |
| `error` | `FarcasterAuthError \| null` | Error from the last attempt with error code |
| `user` | `FarcasterUser \| null` | The signed-in user data |
| `session` | `Session \| null` | The current session data |
| `isAuthenticated` | `boolean` | Whether a user is authenticated |
| `reset` | `() => void` | Resets the hook state |
| `refreshSession` | `() => Promise<void>` | Manually refresh session from the server |

### `useFarcasterLink`

A hook for linking/unlinking Farcaster accounts to existing users.

```tsx
'use client';
import { useFarcasterLink } from "better-auth-farcaster-plugin/react";
import { authClient } from "~/lib/auth/auth-client";
import sdk from "@farcaster/frame-sdk";

export function LinkFarcasterButton({ currentUser }) {
    const { link, unlink, isLoading, isLinking, isUnlinking, error } = useFarcasterLink({
        authClient,  // Pass the full auth client
        getToken: async () => {
            const result = await sdk.quickAuth.getToken();
            return result.token;
        },
        onLinkSuccess: (response) => {
            console.log("Linked FID:", response.user.fid);
        },
        onUnlinkSuccess: (response) => {
            console.log("Farcaster unlinked");
        },
        onError: (error) => {
            console.error("Error:", error.code, error.message);
        },
    });

    if (currentUser.fid) {
        return (
            <button onClick={unlink} disabled={isLoading}>
                {isUnlinking ? "Unlinking..." : "Unlink Farcaster"}
            </button>
        );
    }

    return (
        <button onClick={link} disabled={isLoading}>
            {isLinking ? "Linking..." : "Link Farcaster Account"}
        </button>
    );
}
```

#### `useFarcasterLink` Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `authClient` | `BetterAuthClientForLink` | ✅ | The full Better Auth client with Farcaster plugin |
| `getToken` | `() => Promise<string>` | ✅ | Function that returns a Farcaster Quick Auth token |
| `onLinkSuccess` | `(response) => void` | ❌ | Callback fired on successful link |
| `onUnlinkSuccess` | `(response) => void` | ❌ | Callback fired on successful unlink |
| `onError` | `(error: FarcasterAuthError) => void` | ❌ | Callback fired on error with typed error |

#### `useFarcasterLink` Return Values

| Value | Type | Description |
|-------|------|-------------|
| `link` | `() => Promise<void>` | Function to link Farcaster account |
| `unlink` | `() => Promise<void>` | Function to unlink Farcaster account |
| `isLoading` | `boolean` | Whether any operation is in progress |
| `isLinking` | `boolean` | Whether linking is in progress |
| `isUnlinking` | `boolean` | Whether unlinking is in progress |
| `error` | `FarcasterAuthError \| null` | Error from the last attempt with error code |
| `user` | `FarcasterUser \| null` | Updated user data after operation |
| `reset` | `() => void` | Resets the hook state |

## 🎯 Error Handling

The plugin provides typed errors with error codes for better error handling:

```typescript
import { FarcasterAuthError, type FarcasterAuthErrorCode } from "better-auth-farcaster-plugin/react";

// Error codes
type FarcasterAuthErrorCode =
    | 'INVALID_TOKEN'      // Token is invalid or malformed
    | 'SESSION_EXPIRED'    // Session has expired
    | 'RATE_LIMITED'       // Too many requests
    | 'NETWORK_ERROR'      // Network request failed
    | 'TOKEN_FETCH_FAILED' // Failed to get token from getToken function
    | 'UNKNOWN';           // Unknown error

// Usage
onError: (error) => {
    switch (error.code) {
        case 'RATE_LIMITED':
            console.log("Please wait before trying again");
            break;
        case 'INVALID_TOKEN':
            console.log("Authentication failed - invalid token");
            break;
        case 'SESSION_EXPIRED':
            console.log("Your session has expired");
            break;
        default:
            console.error("Error:", error.message);
    }
}
```

## 📚 API Reference

### Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/farcaster/sign-in` | POST | Sign in with a Farcaster Quick Auth token |
| `/farcaster/link` | POST | Link a Farcaster account to an existing user |
| `/farcaster/unlink` | POST | Unlink a Farcaster account from the current user |
| `/farcaster/profile` | GET | Get the Farcaster profile for the current user |

### Client Methods

```typescript
// Sign in with Farcaster
const { data, error } = await authClient.farcaster.signIn({ 
    token: "quick-auth-token" 
});

// Link Farcaster to existing account (requires session)
const { data, error } = await authClient.farcaster.link({ 
    token: "quick-auth-token" 
});

// Unlink Farcaster from account (requires session)
const { data, error } = await authClient.farcaster.unlink();

// Get Farcaster profile (requires session)
const { data, error } = await authClient.farcaster.profile();
```

### Response Types

```typescript
// Sign In Response
interface FarcasterSignInResponse {
    user: FarcasterUser;
    session: Session;
}

// Profile Response
interface FarcasterProfileResponse {
    fid: number;
    user: FarcasterUser;
}

// Link/Unlink Response
interface FarcasterLinkResponse {
    success: boolean;
    user: FarcasterUser;
}
```

## 🔒 Rate Limiting

The plugin includes built-in rate limiting for authentication endpoints:

- **Sign In**: 10 requests per minute
- **Link Account**: 5 requests per minute

## 📝 Notes

- This plugin adds a `fid` (Farcaster ID) column to the Better Auth `user` table
- The `fid` field is unique, so each Farcaster account can only be linked to one user
- Users created through Farcaster sign-in have auto-verified emails (set to `{fid}@farcaster.local` by default)
- Use the `resolveUserData` option to fetch real user data from Farcaster APIs
- React hooks are optional and only loaded when importing from `/react`

## 🔗 Dependencies

- [better-auth](https://www.better-auth.com/)
- [@farcaster/quick-auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth)
- [zod](https://zod.dev/)

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.