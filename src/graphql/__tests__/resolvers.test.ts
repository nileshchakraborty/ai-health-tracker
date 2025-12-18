import { describe, it, expect, beforeEach } from 'vitest';
import { resolvers, GraphQLContext } from '../resolvers';
import { InMemoryDatabaseAdapter } from '@/adapters/database';
import { OllamaAdapter } from '@/adapters/ai';

describe('GraphQL Resolvers', () => {
    let context: GraphQLContext;
    let userId: string;

    beforeEach(async () => {
        const database = new InMemoryDatabaseAdapter();
        await database.connect();

        const ai = new OllamaAdapter({
            baseUrl: 'http://localhost:11434',
            model: 'llama3.2',
        });

        context = { database, ai };

        // Create test user
        const user = await database.createUser({
            email: 'test@example.com',
            fullName: 'Test User',
        });
        userId = user.id;
    });

    describe('Query.user', () => {
        it('should return user by id', async () => {
            const result = await resolvers.Query.user(null, { id: userId }, context);
            expect(result).not.toBeNull();
            expect(result?.email).toBe('test@example.com');
        });

        it('should return null for non-existent user', async () => {
            const result = await resolvers.Query.user(null, { id: 'fake-id' }, context);
            expect(result).toBeNull();
        });
    });

    describe('Query.userByEmail', () => {
        it('should return user by email', async () => {
            const result = await resolvers.Query.userByEmail(
                null,
                { email: 'test@example.com' },
                context
            );
            expect(result).not.toBeNull();
            expect(result?.id).toBe(userId);
        });
    });

    describe('Mutation.createUser', () => {
        it('should create a new user', async () => {
            const input = {
                email: 'new@example.com',
                fullName: 'New User',
            };

            const result = await resolvers.Mutation.createUser(null, { input }, context);
            expect(result.email).toBe('new@example.com');
            expect(result.id).toBeDefined();
        });
    });

    describe('Mutation.saveHealthData', () => {
        it('should save health data', async () => {
            const input = {
                userId,
                source: 'OURA_RING',
                type: 'HEART_RATE',
                value: 72,
                unit: 'bpm',
                timestamp: new Date(),
            };

            const result = await resolvers.Mutation.saveHealthData(null, { input }, context);
            expect(result.value).toBe(72);
            expect(result.source).toBe('OURA_RING');
            expect(result.type).toBe('HEART_RATE');
        });
    });

    describe('Query.healthData', () => {
        it('should return health data in range', async () => {
            // Save test data
            await context.database.saveHealthData({
                userId,
                source: 'oura_ring',
                type: 'steps',
                value: 5000,
                unit: 'steps',
                timestamp: new Date(),
            });

            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const result = await resolvers.Query.healthData(
                null,
                { userId, range: { start: yesterday, end: now } },
                context
            );

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(5000);
        });
    });

    describe('Mutation.createHealthGoal', () => {
        it('should create a health goal', async () => {
            const input = {
                userId,
                type: 'STEPS',
                target: 10000,
                unit: 'steps',
            };

            const result = await resolvers.Mutation.createHealthGoal(null, { input }, context);
            expect(result.target).toBe(10000);
            expect(result.type).toBe('steps');
        });
    });

    describe('Query.healthGoals', () => {
        it('should return health goals for user', async () => {
            await context.database.createHealthGoal({
                userId,
                type: 'steps',
                target: 10000,
                unit: 'steps',
            });

            const result = await resolvers.Query.healthGoals(null, { userId }, context);
            expect(result).toHaveLength(1);
        });
    });
});
