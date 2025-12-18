import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDatabaseAdapter, getAIAdapter, resetAdapters } from '../factory';
import { InMemoryDatabaseAdapter } from '../database';
import { OllamaAdapter } from '../ai';

describe('Adapter Factory', () => {
    beforeEach(() => {
        resetAdapters();
        vi.unstubAllEnvs();
    });

    describe('getDatabaseAdapter', () => {
        it('should return InMemoryDatabaseAdapter by default', () => {
            const adapter = getDatabaseAdapter();
            expect(adapter).toBeInstanceOf(InMemoryDatabaseAdapter);
        });

        it('should return the same instance on subsequent calls (singleton)', () => {
            const adapter1 = getDatabaseAdapter();
            const adapter2 = getDatabaseAdapter();
            expect(adapter1).toBe(adapter2);
        });

        it('should auto-connect the adapter', () => {
            const adapter = getDatabaseAdapter();
            expect(adapter.isConnected()).toBe(true);
        });
    });

    describe('getAIAdapter', () => {
        it('should return OllamaAdapter by default', () => {
            const adapter = getAIAdapter();
            expect(adapter).toBeInstanceOf(OllamaAdapter);
        });

        it('should return the same instance on subsequent calls (singleton)', () => {
            const adapter1 = getAIAdapter();
            const adapter2 = getAIAdapter();
            expect(adapter1).toBe(adapter2);
        });

        it('should use correct provider name', () => {
            const adapter = getAIAdapter();
            expect(adapter.getProviderName()).toBe('ollama');
        });
    });

    describe('resetAdapters', () => {
        it('should reset singleton instances', () => {
            const adapter1 = getDatabaseAdapter();
            resetAdapters();
            const adapter2 = getDatabaseAdapter();
            expect(adapter1).not.toBe(adapter2);
        });
    });
});
