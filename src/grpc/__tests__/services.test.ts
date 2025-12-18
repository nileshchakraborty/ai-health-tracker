/**
 * Tests for gRPC Services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the adapters
const mockDatabaseAdapter = {
    findUser: vi.fn(),
    createUser: vi.fn(),
    getHealthData: vi.fn(),
    saveHealthData: vi.fn(),
    getHealthGoals: vi.fn(),
};

const mockAIAdapter = {
    chatSync: vi.fn(),
    getInsights: vi.fn(),
    isAvailable: vi.fn(),
};

vi.mock('@/adapters', () => ({
    getDatabaseAdapter: () => mockDatabaseAdapter,
    getAIAdapter: () => mockAIAdapter,
}));

describe('gRPC Services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('HealthDataService', () => {
        describe('BatchUpload', () => {
            it('should save multiple health data records', async () => {
                mockDatabaseAdapter.saveHealthData.mockResolvedValue({ id: 'test-1' });

                const healthData = [
                    { userId: 'user-1', type: 'STEPS', value: 5000, unit: 'steps', timestampMs: Date.now() },
                    { userId: 'user-1', type: 'HEART_RATE', value: 72, unit: 'bpm', timestampMs: Date.now() },
                ];

                // Simulate batch save
                for (const data of healthData) {
                    await mockDatabaseAdapter.saveHealthData(data);
                }

                expect(mockDatabaseAdapter.saveHealthData).toHaveBeenCalledTimes(2);
            });
        });

        describe('GetHealthData', () => {
            it('should retrieve health data for user', async () => {
                const mockData = [
                    { id: '1', userId: 'user-1', type: 'STEPS', value: 5000 },
                    { id: '2', userId: 'user-1', type: 'HEART_RATE', value: 72 },
                ];
                mockDatabaseAdapter.getHealthData.mockResolvedValue(mockData);

                const result = await mockDatabaseAdapter.getHealthData('user-1', {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31'),
                });

                expect(result).toHaveLength(2);
                expect(result[0].type).toBe('STEPS');
            });

            it('should return empty array for user with no data', async () => {
                mockDatabaseAdapter.getHealthData.mockResolvedValue([]);

                const result = await mockDatabaseAdapter.getHealthData('unknown-user', {
                    start: new Date(),
                    end: new Date(),
                });

                expect(result).toHaveLength(0);
            });
        });
    });

    describe('UserService', () => {
        describe('GetUser', () => {
            it('should return user by ID', async () => {
                mockDatabaseAdapter.findUser.mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    fullName: 'Test User',
                });

                const result = await mockDatabaseAdapter.findUser('user-1');

                expect(result).toBeDefined();
                expect(result?.email).toBe('test@example.com');
            });

            it('should return null for non-existent user', async () => {
                mockDatabaseAdapter.findUser.mockResolvedValue(null);

                const result = await mockDatabaseAdapter.findUser('unknown');

                expect(result).toBeNull();
            });
        });

        describe('CreateUser', () => {
            it('should create a new user', async () => {
                mockDatabaseAdapter.createUser.mockResolvedValue({
                    id: 'new-user',
                    email: 'new@example.com',
                    fullName: 'New User',
                });

                const result = await mockDatabaseAdapter.createUser({
                    email: 'new@example.com',
                    fullName: 'New User',
                });

                expect(result.id).toBe('new-user');
                expect(result.email).toBe('new@example.com');
            });
        });

        describe('GetHealthGoals', () => {
            it('should return health goals for user', async () => {
                mockDatabaseAdapter.getHealthGoals.mockResolvedValue([
                    { id: 'goal-1', type: 'STEPS', targetValue: 10000 },
                    { id: 'goal-2', type: 'SLEEP', targetValue: 8 },
                ]);

                const result = await mockDatabaseAdapter.getHealthGoals('user-1');

                expect(result).toHaveLength(2);
                expect(result[0].type).toBe('STEPS');
            });
        });
    });

    describe('AIService', () => {
        describe('GetInsights', () => {
            it('should generate insights from health data', async () => {
                mockAIAdapter.getInsights.mockResolvedValue('Based on your data, you should sleep more.');

                const healthData = [{ type: 'SLEEP_DURATION', value: 5 }];
                const result = await mockAIAdapter.getInsights(healthData);

                expect(result).toContain('sleep');
            });
        });

        describe('Chat', () => {
            it('should respond to chat messages', async () => {
                mockAIAdapter.chatSync.mockResolvedValue('I can help you improve your health!');

                const result = await mockAIAdapter.chatSync([
                    { role: 'user', content: 'How can I sleep better?' },
                ]);

                expect(result).toContain('help');
            });
        });

        describe('isAvailable', () => {
            it('should check if AI is available', async () => {
                mockAIAdapter.isAvailable.mockResolvedValue(true);

                const result = await mockAIAdapter.isAvailable();

                expect(result).toBe(true);
            });
        });
    });
});
