import { AIPort, AIConfig } from '@/ports/ai.port';
import { Message, HealthData } from '@/entities';

/**
 * OllamaAdapter
 * 
 * Adapter for running AI locally via Ollama.
 * Supports streaming and non-streaming chat responses.
 */
export class OllamaAdapter implements AIPort {
    private baseUrl: string;
    private model: string;
    private temperature: number;

    constructor(config: AIConfig) {
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.model = config.model || 'llama3.2';
        this.temperature = config.temperature ?? 0.7;
    }

    getProviderName(): string {
        return 'ollama';
    }

    getModelName(): string {
        return this.model;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async chat(messages: Message[]): Promise<AsyncIterable<string>> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: this.formatMessages(messages),
                stream: true,
                options: { temperature: this.temperature },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        return this.streamResponse(response.body);
    }

    async chatSync(messages: Message[]): Promise<string> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: this.formatMessages(messages),
                stream: false,
                options: { temperature: this.temperature },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || '';
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

    private formatMessages(messages: Message[]): Array<{ role: string; content: string }> {
        return messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
    }

    private async *streamResponse(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
        const reader = body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter((line) => line.trim());

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            yield json.message.content;
                        }
                    } catch {
                        // Skip invalid JSON lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
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
                const values = items.map((i) => `${i.value} ${i.unit} (${i.source})`).join(', ');
                return `${type}: ${values}`;
            })
            .join('\n');
    }
}
