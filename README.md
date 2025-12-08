# Farcaster Plugin for Better-Auth

## 🗒️ Description
A community-made plugin that allows you to authenticate users via [Farcaster Quick Auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth). This plugin provides a seamless integration with Better Auth to support Farcaster-based authentication in your applications.

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
import { farcasterAuthClient, type FarcasterAuthClient } from "better-auth-farcaster-plugin";

const client = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://example.com",
    plugins: [
        farcasterAuthClient(),
    ],
});

// Export with proper types
export const authClient = client as typeof client & { farcaster: FarcasterAuthClient };
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
    const { data, error } = await authClient.farcaster.signInWithFarcaster({ token });
    
    if (error) {
        console.error("Sign in failed:", error.message);
        return;
    }
    
    console.log("Signed in as:", data.user);
}
```

### Example React Component

```tsx
'use client';
import { sdk } from "@farcaster/miniapp-sdk";
import { useState, useCallback } from "react";
import { authClient } from "~/lib/auth/auth-client";

export function SignInWithFarcasterButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();

    const handleSignIn = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(undefined);
            
            // Get Quick Auth token
            const { token } = await sdk.quickAuth.getToken();
            
            // Sign in with Better Auth
            const { data, error } = await authClient.farcaster.signInWithFarcaster({ token });
            
            if (error) {
                setError(error.message);
                return;
            }
            
            // User is now signed in!
            console.log("Signed in:", data.user);
            
            // Signal that the app is ready
            sdk.actions.ready();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div>
            <button onClick={handleSignIn} disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In With Farcaster"}
            </button>
            {error && <p className="text-red-500">{error}</p>}
        </div>
    );
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
const { data, error } = await authClient.farcaster.signInWithFarcaster({ 
    token: "quick-auth-token" 
});

// Link Farcaster to existing account (requires session)
const { data, error } = await authClient.farcaster.linkFarcasterAccount({ 
    token: "quick-auth-token" 
});

// Unlink Farcaster from account (requires session)
const { data, error } = await authClient.farcaster.unlinkFarcasterAccount();

// Get Farcaster profile (requires session)
const { data, error } = await authClient.farcaster.getFarcasterProfile();
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

## 🔗 Dependencies

- [better-auth](https://www.better-auth.com/)
- [@farcaster/quick-auth](https://docs.farcaster.xyz/developers/guides/auth-kit/quick-auth)
- [zod](https://zod.dev/)

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.