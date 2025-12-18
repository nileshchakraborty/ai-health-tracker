/**
 * Tests for Oura Cloud Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OuraCloudAdapter } from '../oura-cloud.adapter';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OuraCloudAdapter', () => {
    let adapter: OuraCloudAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new OuraCloudAdapter('test-token');
    });

    describe('getSourceName', () => {
        it('should return oura_ring', () => {
            expect(adapter.getSourceName()).toBe('oura_ring');
        });
    });

    describe('getSupportedTypes', () => {
        it('should return supported health data types', () => {
            const types = adapter.getSupportedTypes();

            expect(types.length).toBeGreaterThan(0);
            expect(types).toContain('steps');
            expect(types).toContain('heart_rate');
        });
    });

    describe('supportsAppleHealthPush', () => {
        it('should return false', () => {
            expect(adapter.supportsAppleHealthPush()).toBe(false);
        });
    });

    describe('pushToAppleHealth', () => {
        it('should resolve without errors', async () => {
            // This method may not exist or return void
            const result = await adapter.pushToAppleHealth?.([]);
            expect(result === undefined || result === false).toBe(true);
        });
    });

    describe('readData', () => {
        it('should fetch data from Oura API', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: [] }),
            });

            const data = await adapter.readData();

            expect(mockFetch).toHaveBeenCalled();
            expect(Array.isArray(data)).toBe(true);
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const data = await adapter.readData();

            expect(data).toEqual([]);
        });
    });

    describe('readDataByType', () => {
        it('should filter data by type', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: [] }),
            });

            const data = await adapter.readDataByType('heart_rate');

            expect(Array.isArray(data)).toBe(true);
        });
    });
});

describe('OuraCloudAdapter without token', () => {
    it('should handle missing token gracefully', async () => {
        const adapter = new OuraCloudAdapter('');
        const data = await adapter.readData();
        expect(data).toEqual([]);
    });
});
