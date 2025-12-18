/**
 * Adapter Factory
 * 
 * Creates adapters based on environment configuration.
 * Uses feature flags to enable advanced features.
 */

import { DatabasePort } from '@/ports/database.port';
import { AIPort } from '@/ports/ai.port';
import { InMemoryDatabaseAdapter } from '@/adapters/database';
import { OllamaAdapter, LiteLLMAdapter } from '@/adapters/ai';
import config from '@/config';

// Singleton instances
let databaseInstance: DatabasePort | null = null;
let aiInstance: AIPort | null = null;

export function getDatabaseAdapter(): DatabasePort {
    if (databaseInstance) {
        return databaseInstance;
    }

    switch (config.database.adapter) {
        case 'memory':
            databaseInstance = new InMemoryDatabaseAdapter();
            break;
        case 'sqlite':
            console.warn('SQLite adapter not implemented, falling back to memory');
            databaseInstance = new InMemoryDatabaseAdapter();
            break;
        case 'postgres':
            console.warn('Postgres adapter not implemented, falling back to memory');
            databaseInstance = new InMemoryDatabaseAdapter();
            break;
        default:
            databaseInstance = new InMemoryDatabaseAdapter();
    }

    // Auto-connect
    databaseInstance.connect();

    return databaseInstance;
}

export function getAIAdapter(): AIPort {
    if (aiInstance) {
        return aiInstance;
    }

    // Use LiteLLM only if explicitly enabled via feature flag
    if (config.features.litellm || config.ai.adapter === 'litellm') {
        aiInstance = new LiteLLMAdapter({
            primaryModel: config.ai.litellm?.primaryModel || 'ollama/llama3.2',
            fallbackModels: config.ai.litellm?.fallbackModels || [],
            cacheEnabled: config.ai.litellm?.cacheEnabled ?? true,
            cacheTTLSeconds: config.ai.litellm?.cacheTTLSeconds ?? 300,
            baseUrl: config.ai.ollama.baseUrl,
            model: config.ai.ollama.model,
            temperature: config.ai.ollama.temperature,
            circuitBreakerEnabled: config.features.circuitBreaker,
        });
        return aiInstance;
    }

    // Default: simple Ollama adapter
    aiInstance = new OllamaAdapter({
        baseUrl: config.ai.ollama.baseUrl,
        model: config.ai.ollama.model,
        temperature: config.ai.ollama.temperature,
    });

    return aiInstance;
}

// For testing: reset adapters
export function resetAdapters(): void {
    databaseInstance = null;
    aiInstance = null;
}

// Get all adapters as context object
export function getAdapterContext() {
    return {
        database: getDatabaseAdapter(),
        ai: getAIAdapter(),
    };
}

// Check if feature is enabled
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
    return config.features[feature];
}
