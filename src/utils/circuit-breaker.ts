/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides resilience for external service calls with:
 * - Automatic failure detection
 * - Circuit opening after threshold failures
 * - Half-open state for recovery testing
 * - Configurable timeouts and thresholds
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    /** Name for logging and monitoring */
    name: string;
    /** Number of failures before opening circuit */
    failureThreshold: number;
    /** Time in ms before trying again (half-open) */
    resetTimeout: number;
    /** Number of successes in half-open to close circuit */
    successThreshold: number;
    /** Request timeout in ms */
    timeout: number;
    /** Optional fallback function when circuit is open */
    fallback?: () => Promise<unknown>;
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: Date | null;
    totalCalls: number;
    totalFailures: number;
    totalSuccesses: number;
}

const DEFAULT_CONFIG: Partial<CircuitBreakerConfig> = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    successThreshold: 2,
    timeout: 10000, // 10 seconds
};

/**
 * Circuit Breaker
 * 
 * Wraps async functions with circuit breaker logic.
 */
export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failures = 0;
    private successes = 0;
    private lastFailureTime: number | null = null;
    private totalCalls = 0;
    private totalFailures = 0;
    private totalSuccesses = 0;
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> & { name: string }) {
        this.config = { ...DEFAULT_CONFIG, ...config } as CircuitBreakerConfig;
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.totalCalls++;

        // Check if circuit is OPEN
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                console.log(`[CircuitBreaker:${this.config.name}] Transitioning to HALF_OPEN`);
            } else {
                console.log(`[CircuitBreaker:${this.config.name}] Circuit OPEN - rejecting call`);
                return this.handleOpenCircuit();
            }
        }

        try {
            const result = await this.executeWithTimeout(fn);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Execute with configurable timeout
     */
    private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Circuit breaker timeout after ${this.config.timeout}ms`)), this.config.timeout)
            ),
        ]);
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        this.totalSuccesses++;

        if (this.state === 'HALF_OPEN') {
            this.successes++;
            if (this.successes >= this.config.successThreshold) {
                this.close();
            }
        } else {
            // Reset failure count on success in CLOSED state
            this.failures = 0;
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(error: unknown): void {
        this.totalFailures++;
        this.failures++;
        this.lastFailureTime = Date.now();

        console.error(`[CircuitBreaker:${this.config.name}] Failure ${this.failures}/${this.config.failureThreshold}:`,
            error instanceof Error ? error.message : error);

        if (this.state === 'HALF_OPEN') {
            this.open();
        } else if (this.failures >= this.config.failureThreshold) {
            this.open();
        }
    }

    /**
     * Open the circuit (stop allowing requests)
     */
    private open(): void {
        this.state = 'OPEN';
        this.successes = 0;
        console.warn(`[CircuitBreaker:${this.config.name}] Circuit OPENED after ${this.failures} failures`);
    }

    /**
     * Close the circuit (allow requests)
     */
    private close(): void {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        console.log(`[CircuitBreaker:${this.config.name}] Circuit CLOSED - service recovered`);
    }

    /**
     * Check if we should try to reset the circuit
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return true;
        return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
    }

    /**
     * Handle request when circuit is open
     */
    private async handleOpenCircuit<T>(): Promise<T> {
        if (this.config.fallback) {
            console.log(`[CircuitBreaker:${this.config.name}] Using fallback`);
            return this.config.fallback() as Promise<T>;
        }
        throw new Error(`[CircuitBreaker:${this.config.name}] Circuit is OPEN - service unavailable`);
    }

    /**
     * Get current circuit state and statistics
     */
    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
        };
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Force reset the circuit (for testing/manual intervention)
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        console.log(`[CircuitBreaker:${this.config.name}] Circuit manually reset`);
    }

    /**
     * Check if circuit is allowing requests
     */
    isHealthy(): boolean {
        return this.state !== 'OPEN';
    }
}

// Pre-configured circuit breakers for common services
export const circuitBreakers = {
    ai: new CircuitBreaker({
        name: 'AI',
        failureThreshold: 3,
        resetTimeout: 60000, // 1 minute
        successThreshold: 2,
        timeout: 30000, // 30 seconds (AI can be slow)
    }),

    ouraApi: new CircuitBreaker({
        name: 'OuraAPI',
        failureThreshold: 5,
        resetTimeout: 30000, // 30 seconds
        successThreshold: 2,
        timeout: 10000,
    }),

    healthKit: new CircuitBreaker({
        name: 'HealthKit',
        failureThreshold: 3,
        resetTimeout: 15000, // 15 seconds
        successThreshold: 1,
        timeout: 5000,
    }),

    database: new CircuitBreaker({
        name: 'Database',
        failureThreshold: 3,
        resetTimeout: 10000, // 10 seconds
        successThreshold: 1,
        timeout: 5000,
    }),
};

/**
 * Create a new circuit breaker with custom config
 */
export function createCircuitBreaker(config: Partial<CircuitBreakerConfig> & { name: string }): CircuitBreaker {
    return new CircuitBreaker(config);
}

/**
 * Get all circuit breaker stats for monitoring
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    return {
        ai: circuitBreakers.ai.getStats(),
        ouraApi: circuitBreakers.ouraApi.getStats(),
        healthKit: circuitBreakers.healthKit.getStats(),
        database: circuitBreakers.database.getStats(),
    };
}

export default CircuitBreaker;
