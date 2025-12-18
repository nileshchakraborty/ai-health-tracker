/**
 * Oura OAuth2 Configuration
 * 
 * OAuth2 flow for Oura Cloud API.
 * Register your app: https://cloud.ouraring.com/oauth/applications
 */

export interface OuraOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes?: string[];
}

export const OURA_OAUTH_CONFIG = {
    authorizationUrl: 'https://cloud.ouraring.com/oauth/authorize',
    tokenUrl: 'https://api.ouraring.com/oauth/token',
    apiBaseUrl: 'https://api.ouraring.com/v2',

    // Default scopes
    defaultScopes: [
        'daily',
        'heartrate',
        'workout',
        'personal',
        'session',
        'spo2',
    ],
};

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthorizationUrl(config: OuraOAuthConfig, state?: string): string {
    const scopes = config.scopes || OURA_OAUTH_CONFIG.defaultScopes;

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        ...(state && { state }),
    });

    return `${OURA_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
    code: string,
    config: OuraOAuthConfig
): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}> {
    const response = await fetch(OURA_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
    refreshToken: string,
    config: OuraOAuthConfig
): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}> {
    const response = await fetch(OURA_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
    }

    return response.json();
}
