import { Message, HealthData } from '@/entities';

/**
 * AIPort - Port interface for AI operations
 * 
 * This defines the contract that all AI adapters must implement.
 * Allows switching between Ollama, OpenAI, Anthropic without changing business logic.
 */
export interface AIPort {
    /**
     * Send a chat message and receive a streaming response
     * @param messages - Array of conversation messages
     * @returns AsyncIterable that yields response chunks
     */
    chat(messages: Message[]): Promise<AsyncIterable<string>>;

    /**
     * Send a chat message and receive a complete response (non-streaming)
     * @param messages - Array of conversation messages
     * @returns Complete response string
     */
    chatSync(messages: Message[]): Promise<string>;

    /**
     * Generate health insights based on health data
     * @param healthData - Array of health data points
     * @returns AI-generated insights string
     */
    getInsights(healthData: HealthData[]): Promise<string>;

    /**
     * Generate a health summary for a specific time period
     * @param healthData - Array of health data points
     * @param period - Time period description (e.g., "last week", "today")
     * @returns AI-generated summary
     */
    getSummary(healthData: HealthData[], period: string): Promise<string>;

    /**
     * Check if the AI service is available
     * @returns true if the service is reachable
     */
    isAvailable(): Promise<boolean>;

    /**
     * Get the name of the current AI provider
     */
    getProviderName(): string;

    /**
     * Get the model being used
     */
    getModelName(): string;
}

/**
 * Configuration for AI adapters
 */
export interface AIConfig {
    baseUrl?: string;
    apiKey?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
}
