import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaAdapter } from '../ollama.adapter';
import { Message } from '@/entities';

// Mock fetch globally
global.fetch = vi.fn();

describe('OllamaAdapter', () => {
    let adapter: OllamaAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new OllamaAdapter({
            baseUrl: 'http://localhost:11434',
            model: 'llama3.2',
        });
    });

    describe('configuration', () => {
        it('should return correct provider name', () => {
            expect(adapter.getProviderName()).toBe('ollama');
        });

        it('should return correct model name', () => {
            expect(adapter.getModelName()).toBe('llama3.2');
        });
    });

    describe('isAvailable', () => {
        it('should return true when Ollama is reachable', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
            } as Response);

            const available = await adapter.isAvailable();
            expect(available).toBe(true);
            expect(fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
        });

        it('should return false when Ollama is not reachable', async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

            const available = await adapter.isAvailable();
            expect(available).toBe(false);
        });
    });

    describe('chatSync', () => {
        it('should send messages and return response', async () => {
            const mockResponse = {
                message: { content: 'Hello! How can I help you with your health today?' },
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const messages: Message[] = [
                { role: 'user', content: 'Hello' },
            ];

            const response = await adapter.chatSync(messages);
            expect(response).toBe('Hello! How can I help you with your health today?');
        });

        it('should throw error on failed request', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error',
            } as Response);

            const messages: Message[] = [
                { role: 'user', content: 'Hello' },
            ];

            await expect(adapter.chatSync(messages)).rejects.toThrow();
        });
    });

    describe('getInsights', () => {
        it('should generate insights from health data', async () => {
            const mockResponse = {
                message: { content: 'Based on your data, you slept well last night.' },
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const healthData = [
                {
                    id: '1',
                    userId: 'user1',
                    source: 'oura_ring' as const,
                    type: 'sleep_duration' as const,
                    value: 8,
                    unit: 'hours',
                    timestamp: new Date(),
                },
            ];

            const insights = await adapter.getInsights(healthData);
            expect(insights).toContain('slept well');
        });
    });
});
