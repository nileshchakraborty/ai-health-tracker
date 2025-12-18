import { NextRequest } from 'next/server';
import { getAIAdapter } from '@/adapters/factory';
import { Message } from '@/entities';

/**
 * SSE Chat Endpoint
 * 
 * Streams AI responses using Server-Sent Events.
 * Better than GraphQL subscriptions for token-by-token streaming.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const messages: Message[] = body.messages || [];

        if (!messages.length) {
            return new Response(
                JSON.stringify({ error: 'Messages are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const ai = getAIAdapter();

        // Check if AI is available
        const isAvailable = await ai.isAvailable();
        if (!isAvailable) {
            return new Response(
                JSON.stringify({
                    error: 'AI service unavailable',
                    provider: ai.getProviderName(),
                    hint: 'Make sure Ollama is running: ollama serve'
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Create SSE stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // Add system prompt for health assistant
                    const messagesWithSystem: Message[] = [
                        {
                            role: 'system',
                            content: `You are AIDOC, a compassionate and knowledgeable AI health assistant. 
Your role is to help users understand their health data and build healthy habits.
Be empathetic, supportive, and provide actionable insights.
Focus on patterns, trends, and gentle recommendations.
Never diagnose medical conditions - encourage consulting healthcare professionals when needed.`,
                        },
                        ...messages,
                    ];

                    const response = await ai.chat(messagesWithSystem);

                    for await (const chunk of response) {
                        // SSE format: data: <content>\n\n
                        const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    }

                    // Send done event
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const data = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// GET endpoint for EventSource clients
export async function GET() {
    return new Response(
        JSON.stringify({
            message: 'SSE Chat endpoint. Use POST with { messages: [...] }',
            example: {
                messages: [
                    { role: 'user', content: 'How can I improve my sleep?' }
                ]
            }
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}
