#!/usr/bin/env tsx
/**
 * JWT Token Generator Script
 * 
 * Generates JWT tokens for testing API endpoints.
 * 
 * Usage:
 *   npx tsx scripts/generate-jwt.ts [userId] [expiresIn]
 * 
 * Example:
 *   npx tsx scripts/generate-jwt.ts user123 1h
 */

import * as crypto from 'crypto';

interface JWTPayload {
    sub: string;
    iat: number;
    exp: number;
}

function base64urlEncode(str: string): string {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateJWT(
    userId: string,
    secret: string,
    expiresIn: string = '1h'
): string {
    const header = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const expMs = parseExpiration(expiresIn);

    const payload: JWTPayload = {
        sub: userId,
        iat: now,
        exp: now + Math.floor(expMs / 1000),
    };

    const headerEncoded = base64urlEncode(JSON.stringify(header));
    const payloadEncoded = base64urlEncode(JSON.stringify(payload));

    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

function parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format. Use: 1s, 1m, 1h, 1d');

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
}

// CLI execution
const args = process.argv.slice(2);
const userId = args[0] || 'test-user-123';
const expiresIn = args[1] || '1h';
const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';

const token = generateJWT(userId, secret, expiresIn);

console.log('Generated JWT Token:');
console.log('====================');
console.log(token);
console.log('');
console.log('Payload:');
console.log(`  userId: ${userId}`);
console.log(`  expiresIn: ${expiresIn}`);
console.log('');
console.log('Use in requests:');
console.log(`  Authorization: Bearer ${token}`);
