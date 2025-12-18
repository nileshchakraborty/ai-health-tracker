/**
 * Tests for Circuit Breaker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, createCircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
        breaker = createCircuitBreaker({
            name: 'test',
            failureThreshold: 3,
            resetTimeout: 1000,
            successThreshold: 2,
            timeout: 5000,
        });
    });

    describe('initial state', () => {
        it('should start in CLOSED state', () => {
            expect(breaker.getState()).toBe('CLOSED');
        });

        it('should be healthy initially', () => {
            expect(breaker.isHealthy()).toBe(true);
        });
    });

    describe('execute', () => {
        it('should execute successful function', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            const result = await breaker.execute(fn);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalled();
        });

        it('should throw error from failing function', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            await expect(breaker.execute(fn)).rejects.toThrow('fail');
        });

        it('should open after threshold failures', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            // Fail 3 times (threshold)
            for (let i = 0; i < 3; i++) {
                await breaker.execute(fn).catch(() => { });
            }

            expect(breaker.getState()).toBe('OPEN');
            expect(breaker.isHealthy()).toBe(false);
        });

        it('should reject calls when OPEN', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            // Open the circuit
            for (let i = 0; i < 3; i++) {
                await breaker.execute(fn).catch(() => { });
            }

            // Next call should be rejected without calling fn
            const callCount = fn.mock.calls.length;
            await expect(breaker.execute(fn)).rejects.toThrow('Circuit is OPEN');
            expect(fn.mock.calls.length).toBe(callCount); // fn not called again
        });
    });

    describe('getStats', () => {
        it('should return statistics', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            await breaker.execute(fn);

            const stats = breaker.getStats();

            expect(stats.state).toBe('CLOSED');
            expect(stats.totalCalls).toBe(1);
            expect(stats.totalSuccesses).toBe(1);
            expect(stats.totalFailures).toBe(0);
        });
    });

    describe('reset', () => {
        it('should reset circuit to CLOSED', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            // Open the circuit
            for (let i = 0; i < 3; i++) {
                await breaker.execute(fn).catch(() => { });
            }

            expect(breaker.getState()).toBe('OPEN');

            breaker.reset();

            expect(breaker.getState()).toBe('CLOSED');
            expect(breaker.isHealthy()).toBe(true);
        });
    });
});

describe('CircuitBreaker with fallback', () => {
    it('should use fallback when OPEN', async () => {
        const fallback = vi.fn().mockResolvedValue('fallback result');
        const breaker = createCircuitBreaker({
            name: 'test-fallback',
            failureThreshold: 1,
            resetTimeout: 10000,
            successThreshold: 1,
            timeout: 5000,
            fallback,
        });

        const fn = vi.fn().mockRejectedValue(new Error('fail'));

        // Open circuit
        await breaker.execute(fn).catch(() => { });

        // Next call should use fallback
        const result = await breaker.execute(fn);

        expect(result).toBe('fallback result');
        expect(fallback).toHaveBeenCalled();
    });
});
