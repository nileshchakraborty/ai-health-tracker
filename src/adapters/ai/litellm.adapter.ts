/**
 * LiteLLM Adapter
 * 
 * Unified AI adapter using LiteLLM for:
 * - Multi-provider support (Ollama, OpenAI, Anthropic, etc.)
 * - Automatic fallbacks
 * - Response caching
 * - Load balancing
 * - Cost tracking
 * - Circuit breaker resilience
 */

import { AIPort, AIConfig } from '@/ports/ai.port';
import { Message, HealthData } from '@/entities';
import { CircuitBreaker, createCircuitBreaker } from '@/utils/circuit-breaker';

interface LiteLLMConfig extends AIConfig {
    primaryModel: string;
    fallbackModels?: string[];
    cacheEnabled?: boolean;
    cacheTTLSeconds?: number;
    timeout?: number;
    maxRetries?: number;
    circuitBreakerEnabled?: boolean;
}

interface CacheEntry {
    response: string;
    timestamp: number;
}

/**
 * LiteLLM Adapter
 * 
 * Provides unified access to multiple LLM providers with fallbacks and circuit breaker.
 */
export class LiteLLMAdapter implements AIPort {
    private config: LiteLLMConfig;
    private cache: Map<string, CacheEntry> = new Map();
    private circuitBreaker: CircuitBreaker;
    private readonly defaultModels = {
        primary: 'ollama/llama3.2',
        fallbacks: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku-20240307'],
    };

    constructor(config?: Partial<LiteLLMConfig>) {
        this.config = {
            primaryModel: config?.primaryModel || this.defaultModels.primary,
            fallbackModels: config?.fallbackModels || [],
            cacheEnabled: config?.cacheEnabled ?? true,
            cacheTTLSeconds: config?.cacheTTLSeconds ?? 300, // 5 minutes
            timeout: config?.timeout ?? 30000,
            maxRetries: config?.maxRetries ?? 2,
            baseUrl: config?.baseUrl || 'http://localhost:11434',
            model: config?.model || 'llama3.2',
            temperature: config?.temperature ?? 0.7,
            circuitBreakerEnabled: config?.circuitBreakerEnabled ?? true,
        };

        // Initialize circuit breaker for AI calls
        this.circuitBreaker = createCircuitBreaker({
            name: 'LiteLLM-AI',
            failureThreshold: 3,
            resetTimeout: 60000, // 1 minute
            successThreshold: 2,
            timeout: this.config.timeout!,
        });
    }

    getProviderName(): string {
        return 'litellm';
    }

    getModelName(): string {
        return this.config.primaryModel;
    }

    async isAvailable(): Promise<boolean> {
        // Try primary model first
        if (await this.checkModelAvailability(this.config.primaryModel)) {
            return true;
        }

        // Try fallbacks
        for (const model of this.config.fallbackModels || []) {
            if (await this.checkModelAvailability(model)) {
                return true;
            }
        }

        return false;
    }

    private async checkModelAvailability(model: string): Promise<boolean> {
        try {
            const provider = model.split('/')[0];

            if (provider === 'ollama') {
                const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                    signal: AbortSignal.timeout(5000),
                });
                return response.ok;
            }

            // For cloud providers, check if API key is configured
            if (provider === 'openai') {
                return !!process.env.OPENAI_API_KEY;
            }
            if (provider === 'anthropic') {
                return !!process.env.ANTHROPIC_API_KEY;
            }

            return false;
        } catch {
            return false;
        }
    }

    async chat(messages: Message[]): Promise<AsyncIterable<string>> {
        return this.streamCompletion(messages);
    }

    async chatSync(messages: Message[]): Promise<string> {
        // Check cache first
        const cacheKey = this.getCacheKey(messages);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        // Use circuit breaker if enabled
        if (this.config.circuitBreakerEnabled) {
            return this.circuitBreaker.execute(() => this.executeWithFallbacks(messages, cacheKey));
        }

        return this.executeWithFallbacks(messages, cacheKey);
    }

    private async executeWithFallbacks(messages: Message[], cacheKey: string): Promise<string> {
        // Try primary model with fallbacks
        const models = [this.config.primaryModel, ...(this.config.fallbackModels || [])];
        let lastError: Error | null = null;

        for (const model of models) {
            try {
                const response = await this.callModel(model, messages);

                // Cache successful response
                if (this.config.cacheEnabled) {
                    this.setCache(cacheKey, response);
                }

                return response;
            } catch (error) {
                lastError = error as Error;
                console.warn(`Model ${model} failed, trying fallback...`, error);
            }
        }

        throw lastError || new Error('All models failed');
    }

    async getInsights(healthData: HealthData[]): Promise<string> {
        const systemPrompt = this.buildHealthSystemPrompt();
        const dataPrompt = this.formatHealthDataForPrompt(healthData);

        const messages: Message[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this health data and provide insights:\n${dataPrompt}` },
        ];

        return this.chatSync(messages);
    }

    async getSummary(healthData: HealthData[], period: string): Promise<string> {
        const systemPrompt = this.buildHealthSystemPrompt();
        const dataPrompt = this.formatHealthDataForPrompt(healthData);

        const messages: Message[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Provide a health summary for ${period}:\n${dataPrompt}` },
        ];

        return this.chatSync(messages);
    }

    private async callModel(model: string, messages: Message[]): Promise<string> {
        const provider = model.split('/')[0];
        const modelName = model.split('/').slice(1).join('/');

        if (provider === 'ollama') {
            return this.callOllama(modelName, messages);
        } else if (provider === 'openai') {
            return this.callOpenAI(modelName, messages);
        } else if (provider === 'anthropic') {
            return this.callAnthropic(modelName, messages);
        }

        throw new Error(`Unsupported provider: ${provider}`);
    }

    private async callOllama(model: string, messages: Message[]): Promise<string> {
        const response = await fetch(`${this.config.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: this.formatMessages(messages),
                stream: false,
                options: { temperature: this.config.temperature },
            }),
            signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || '';
    }

    private async callOpenAI(model: string, messages: Message[]): Promise<string> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: this.formatMessages(messages),
                temperature: this.config.temperature,
            }),
            signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
            throw new Error(`OpenAI request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    private async callAnthropic(model: string, messages: Message[]): Promise<string> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                system: systemMessage,
                messages: userMessages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content,
                })),
                max_tokens: 4096,
                temperature: this.config.temperature,
            }),
            signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
            throw new Error(`Anthropic request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || '';
    }

    private async *streamCompletion(messages: Message[]): AsyncIterable<string> {
        const model = this.config.primaryModel;
        const provider = model.split('/')[0];
        const modelName = model.split('/').slice(1).join('/');

        if (provider === 'ollama') {
            yield* this.streamOllama(modelName, messages);
        } else {
            // For cloud providers, fall back to non-streaming
            const response = await this.chatSync(messages);
            yield response;
        }
    }

    private async *streamOllama(model: string, messages: Message[]): AsyncIterable<string> {
        const response = await fetch(`${this.config.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: this.formatMessages(messages),
                stream: true,
                options: { temperature: this.config.temperature },
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`Ollama streaming failed: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            yield json.message.content;
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    // Cache methods
    private getCacheKey(messages: Message[]): string {
        return JSON.stringify(messages);
    }

    private getFromCache(key: string): string | null {
        if (!this.config.cacheEnabled) return null;

        const entry = this.cache.get(key);
        if (!entry) return null;

        const age = (Date.now() - entry.timestamp) / 1000;
        if (age > this.config.cacheTTLSeconds!) {
            this.cache.delete(key);
            return null;
        }

        return entry.response;
    }

    private setCache(key: string, response: string): void {
        this.cache.set(key, { response, timestamp: Date.now() });

        // Limit cache size
        if (this.cache.size > 1000) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
    }

    clearCache(): void {
        this.cache.clear();
    }

    getCacheStats(): { size: number; hitRate: number } {
        return { size: this.cache.size, hitRate: 0 }; // Simplified stats
    }

    private formatMessages(messages: Message[]): Array<{ role: string; content: string }> {
        return messages.map(m => ({ role: m.role, content: m.content }));
    }

    private buildHealthSystemPrompt(): string {
        return `You are AIDOC, a compassionate and knowledgeable AI health assistant. 
Your role is to help users understand their health data and build healthy habits.
Be empathetic, supportive, and provide actionable insights.
Focus on patterns, trends, and gentle recommendations.
Never diagnose medical conditions - encourage consulting healthcare professionals when needed.`;
    }

    private formatHealthDataForPrompt(healthData: HealthData[]): string {
        if (healthData.length === 0) {
            return 'No health data available.';
        }

        const grouped = healthData.reduce((acc, data) => {
            if (!acc[data.type]) acc[data.type] = [];
            acc[data.type].push(data);
            return acc;
        }, {} as Record<string, HealthData[]>);

        return Object.entries(grouped)
            .map(([type, items]) => {
                const values = items.map(i => `${i.value} ${i.unit} (${i.source})`).join(', ');
                return `${type}: ${values}`;
            })
            .join('\n');
    }
}

// Factory function
export function createLiteLLMAdapter(config?: Partial<LiteLLMConfig>): LiteLLMAdapter {
    return new LiteLLMAdapter(config);
}
