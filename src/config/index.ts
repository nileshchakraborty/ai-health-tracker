/**
 * Environment Configuration
 * 
 * Centralized config - simple defaults with optional advanced features.
 */

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    grpcPort: parseInt(process.env.GRPC_PORT || '50051', 10),
    publicApiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',

    // Database
    database: {
        adapter: (process.env.DATABASE_ADAPTER || 'memory') as 'memory' | 'sqlite' | 'postgres',
        url: process.env.DATABASE_URL || '',
    },

    // AI - Simple Ollama by default
    ai: {
        adapter: (process.env.AI_ADAPTER || 'ollama') as 'ollama' | 'openai' | 'anthropic' | 'litellm',
        ollama: {
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: process.env.OLLAMA_MODEL || 'llama3.2',
            temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        },
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        },
        // LiteLLM (advanced - requires ENABLE_LITELLM=true)
        litellm: {
            primaryModel: process.env.LITELLM_PRIMARY_MODEL || 'ollama/llama3.2',
            fallbackModels: (process.env.LITELLM_FALLBACK_MODELS || '').split(',').filter(Boolean),
            cacheEnabled: process.env.LITELLM_CACHE_ENABLED !== 'false',
            cacheTTLSeconds: parseInt(process.env.LITELLM_CACHE_TTL || '300', 10),
            timeout: parseInt(process.env.LITELLM_TIMEOUT || '30000', 10),
        },
    },

    // Feature Flags - Everything disabled by default for simplicity
    features: {
        // Core (enabled by default)
        graphql: process.env.ENABLE_GRAPHQL !== 'false',
        sseChat: process.env.ENABLE_SSE_CHAT !== 'false',

        // Advanced (disabled by default - opt-in)
        litellm: process.env.ENABLE_LITELLM === 'true',
        circuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER === 'true',
        grpc: process.env.ENABLE_GRPC === 'true',

        // Health integrations (enabled by default)
        appleHealth: process.env.ENABLE_APPLE_HEALTH !== 'false',
        ouraCloud: process.env.ENABLE_OURA_CLOUD !== 'false',
        ouraBle: process.env.ENABLE_OURA_BLE === 'true', // BLE is experimental
        appleWatch: process.env.ENABLE_APPLE_WATCH !== 'false',
    },

    // Security
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
};

export default config;
