/**
 * Health Status API Route
 * 
 * Returns the health status of all services including circuit breaker states.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllCircuitBreakerStats } from '@/utils/circuit-breaker';
import { getAIAdapter, getDatabaseAdapter } from '@/adapters';

export async function GET(_request: NextRequest) {
    try {
        // Get circuit breaker stats
        const circuitBreakers = getAllCircuitBreakerStats();

        // Check individual services
        const [aiAvailable, dbConnected] = await Promise.all([
            getAIAdapter().isAvailable().catch(() => false),
            getDatabaseAdapter().isConnected(),
        ]);

        const status = {
            status: aiAvailable && dbConnected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                ai: {
                    available: aiAvailable,
                    provider: getAIAdapter().getProviderName(),
                    model: getAIAdapter().getModelName(),
                    circuitBreaker: circuitBreakers.ai,
                },
                database: {
                    connected: dbConnected,
                    circuitBreaker: circuitBreakers.database,
                },
                ouraApi: {
                    circuitBreaker: circuitBreakers.ouraApi,
                },
                healthKit: {
                    circuitBreaker: circuitBreakers.healthKit,
                },
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };

        const httpStatus = status.status === 'healthy' ? 200 : 503;

        return NextResponse.json(status, { status: httpStatus });
    } catch (error) {
        return NextResponse.json(
            {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
