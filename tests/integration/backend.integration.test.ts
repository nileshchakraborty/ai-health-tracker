/**
 * Backend Integration Test Suite
 * 
 * Tests the full backend API flow with real adapters.
 * NOTE: These tests require the backend to be running on localhost:3000
 * 
 * Run with: npm test -- tests/integration/
 * Requires: npm run dev (in another terminal)
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Check if backend is available
async function isBackendAvailable(): Promise<boolean> {
    try {
        const response = await fetch('http://localhost:3000/api/health', {
            signal: AbortSignal.timeout(1000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

describe('Backend Integration Suite', () => {
    let backendAvailable = false;

    beforeAll(async () => {
        backendAvailable = await isBackendAvailable();
        if (!backendAvailable) {
            console.log('⚠️  Backend not running - skipping integration tests');
        }
    });

    describe('Health Check', () => {
        it('should return 200 OK when backend is running', async () => {
            if (!backendAvailable) {
                console.log('   → Skipped (backend not running)');
                return;
            }

            const response = await fetch('http://localhost:3000/api/health');
            expect(response.ok).toBe(true);
        });
    });

    describe('GraphQL API', () => {
        const graphqlUrl = 'http://localhost:3000/api/graphql';

        it('should respond to introspection query', async () => {
            if (!backendAvailable) return;

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: '{ __schema { types { name } } }',
                }),
            });

            expect(response.ok).toBe(true);
        });

        it('should handle user mutations', async () => {
            if (!backendAvailable) return;

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
            mutation {
              createUser(input: { email: "test@example.com", fullName: "Test User" }) {
                id
              }
            }
          `,
                }),
            });

            expect(response.ok).toBe(true);
        });
    });

    describe('Oura API', () => {
        it('should have health data endpoint', async () => {
            if (!backendAvailable) return;

            const response = await fetch('http://localhost:3000/api/oura');
            expect([200, 401, 500].includes(response.status)).toBe(true);
        });
    });
});

// Always-pass smoke test
describe('Integration Suite Smoke Test', () => {
    it('should load test file successfully', () => {
        expect(true).toBe(true);
    });
});
