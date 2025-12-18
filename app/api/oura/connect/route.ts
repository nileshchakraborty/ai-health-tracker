/**
 * Oura OAuth2 Connect Endpoint
 * 
 * Redirects user to Oura authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, OuraOAuthConfig } from '@/adapters/health/oura-oauth';

export async function GET(request: NextRequest) {
    const config: OuraOAuthConfig = {
        clientId: process.env.OURA_CLIENT_ID || '',
        clientSecret: process.env.OURA_CLIENT_SECRET || '',
        redirectUri: process.env.OURA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL}/api/oura/callback`,
    };

    if (!config.clientId) {
        return NextResponse.json(
            {
                error: 'Oura OAuth not configured',
                hint: 'Set OURA_CLIENT_ID and OURA_CLIENT_SECRET in .env. Register app at https://cloud.ouraring.com/oauth/applications'
            },
            { status: 503 }
        );
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    const authUrl = getAuthorizationUrl(config, state);

    // Store state in cookie for verification
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oura_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
    });

    return response;
}
