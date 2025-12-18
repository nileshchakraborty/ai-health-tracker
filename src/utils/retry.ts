/**
 * Retry Utility
 * 
 * Provides configurable retry logic with exponential backoff.
 */

export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Initial delay in ms before first retry */
    initialDelay: number;
    /** Maximum delay in ms between retries */
    maxDelay: number;
    /** Backoff multiplier (e.g., 2 for exponential) */
    backoffMultiplier: number;
    /** Optional function to determine if error is retryable */
    isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
};

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const { maxRetries, initialDelay, maxDelay, backoffMultiplier, isRetryable } = {
        ...DEFAULT_RETRY_CONFIG,
        ...config,
    };

    let lastError: unknown;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt >= maxRetries) {
                break;
            }

            if (isRetryable && !isRetryable(error)) {
                break;
            }

            console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`,
                error instanceof Error ? error.message : error);

            // Wait before retrying
            await sleep(delay);

            // Calculate next delay with exponential backoff
            delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
    }

    throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default retryable error checker
 * Returns true for network errors and 5xx HTTP errors
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('socket hang up') ||
            message.includes('503') ||
            message.includes('502') ||
            message.includes('504')
        );
    }
    return false;
}

export default withRetry;
