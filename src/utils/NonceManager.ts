import type { Adapter } from "better-auth";
/*
    To Create A Random Cuid To Be Used As Nonce
*/
import { createId } from '@paralleldrive/cuid2';

type VerificationRecord = {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

export type NonceManager = {
  generate(): Promise<string>;
  consume(nonce: string): Promise<boolean>;
};

// Your default implementation
export class VerificationTableNonceManager implements NonceManager {
    private adapter: Adapter;
    private nonceLifetimeMs = 10 * 60 * 1000; // 10 minutes

    constructor(adapter: Adapter) {
        this.adapter = adapter;
    }

    async generate(): Promise<string> {
        // Generate a secure, random nonce
        const nonceValue = createId();
        const identifier = `farcaster-nonce:${nonceValue}`;

        await this.adapter.create({
            model: "verification",
            data: {
                identifier: identifier,
                value: "active",
                expiresAt: new Date(Date.now() + this.nonceLifetimeMs),
            }
        });
        return identifier;
    }

    async consume(nonce: string): Promise<boolean> {
        if (!nonce.startsWith('farcaster-nonce:')) {
            return false;
        }

        const verificationRecord = await this.adapter.findOne({
            model: "verification",
            where: [{ field: "identifier", value: nonce }]
        }) as VerificationRecord | null;

        // If no record, it's invalid
        if (!verificationRecord) {
            return false;
        }

        // Clean up the used nonce immediately
        await this.adapter.delete({
            model: "verification",
            where: [{ field: "id", value: verificationRecord.id }]
        });

        // Check for expiration
        if (new Date() > new Date(verificationRecord.expiresAt)) {
            console.warn("Consumed an expired nonce.");
            return false;
        }

        return true;
    }
}