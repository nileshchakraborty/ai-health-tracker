/**
 * Oura OAuth2 Callback Handler
 * 
 * Handles the OAuth2 redirect from Oura.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, OuraOAuthConfig } from '@/adapters/health/oura-oauth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Handle errors
    if (error) {
        return NextResponse.redirect(
            new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
        );
    }

    // Validate code
    if (!code) {
        return NextResponse.redirect(
            new URL('/settings?error=missing_code', request.url)
        );
    }

    // Get OAuth config from environment
    const config: OuraOAuthConfig = {
        clientId: process.env.OURA_CLIENT_ID || '',
        clientSecret: process.env.OURA_CLIENT_SECRET || '',
        redirectUri: process.env.OURA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL}/api/oura/callback`,
    };

    if (!config.clientId || !config.clientSecret) {
        return NextResponse.redirect(
            new URL('/settings?error=oauth_not_configured', request.url)
        );
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForToken(code, config);

        // In production, store tokens securely (encrypted in database)
        // For now, we'll store in a cookie (NOT recommended for production)
        const response = NextResponse.redirect(new URL('/settings?success=oura_connected', request.url));

        // Set secure cookie with tokens (expires when access token expires)
        response.cookies.set('oura_access_token', tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokens.expires_in,
        });

        response.cookies.set('oura_refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        return response;

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Oura OAuth error:', message);
        return NextResponse.redirect(
            new URL(`/settings?error=${encodeURIComponent(message)}`, request.url)
        );
    }
}
