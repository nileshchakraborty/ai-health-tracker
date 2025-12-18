/**
 * Tests for LiteLLM Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteLLMAdapter } from '../litellm.adapter';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LiteLLMAdapter', () => {
    let adapter: LiteLLMAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new LiteLLMAdapter({
            primaryModel: 'ollama/llama3.2',
            fallbackModels: ['openai/gpt-4o-mini'],
            cacheEnabled: true,
            cacheTTLSeconds: 300,
        });
    });

    describe('getProviderName', () => {
        it('should return litellm', () => {
            expect(adapter.getProviderName()).toBe('litellm');
        });
    });

    describe('getModelName', () => {
        it('should return primary model', () => {
            expect(adapter.getModelName()).toBe('ollama/llama3.2');
        });
    });

    describe('isAvailable', () => {
        it('should return true when Ollama is available', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true });

            const result = await adapter.isAvailable();

            expect(result).toBe(true);
        });

        it('should return false when all providers fail', async () => {
            mockFetch.mockRejectedValue(new Error('Connection failed'));

            const result = await adapter.isAvailable();

            expect(result).toBe(false);
        });
    });

    describe('chatSync', () => {
        it('should call Ollama and return response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: { content: 'Hello from AI' } }),
            });

            const response = await adapter.chatSync([
                { role: 'user', content: 'Hello' },
            ]);

            expect(response).toBe('Hello from AI');
        });

        it('should use cache for repeated queries', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: { content: 'Cached response' } }),
            });

            // First call
            await adapter.chatSync([{ role: 'user', content: 'Test' }]);

            // Second call (should use cache)
            const response = await adapter.chatSync([{ role: 'user', content: 'Test' }]);

            expect(response).toBe('Cached response');
            expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to cache
        });

        it('should handle Ollama errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Ollama unavailable'));

            await expect(adapter.chatSync([
                { role: 'user', content: 'Hello' },
            ])).rejects.toThrow();
        });
    });

    describe('getInsights', () => {
        it('should generate insights from health data', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: { content: 'Based on your data...' } }),
            });

            const healthData = [
                { id: '1', userId: 'user-1', type: 'STEPS', value: 5000, unit: 'steps', source: 'oura_ring', createdAt: new Date(), timestampMs: Date.now() },
            ];

            const insights = await adapter.getInsights(healthData);

            expect(insights).toContain('Based on your data');
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: { content: 'Response' } }),
            });

            // Populate cache
            await adapter.chatSync([{ role: 'user', content: 'Test' }]);

            // Clear cache
            adapter.clearCache();

            // Should call API again
            await adapter.chatSync([{ role: 'user', content: 'Test' }]);

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCacheStats', () => {
        it('should return cache statistics', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: { content: 'Response' } }),
            });

            await adapter.chatSync([{ role: 'user', content: 'Test' }]);

            const stats = adapter.getCacheStats();

            expect(stats.size).toBe(1);
        });
    });
});

describe('LiteLLMAdapter with defaults', () => {
    it('should use default configuration', () => {
        const adapter = new LiteLLMAdapter();

        expect(adapter.getModelName()).toBe('ollama/llama3.2');
        expect(adapter.getProviderName()).toBe('litellm');
    });
});
