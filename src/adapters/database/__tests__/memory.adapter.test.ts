import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDatabaseAdapter } from '../memory.adapter';
import { User, HealthData, DateRange } from '@/entities';

describe('InMemoryDatabaseAdapter', () => {
    let adapter: InMemoryDatabaseAdapter;

    beforeEach(async () => {
        adapter = new InMemoryDatabaseAdapter();
        await adapter.connect();
    });

    describe('connection', () => {
        it('should connect successfully', async () => {
            expect(adapter.isConnected()).toBe(true);
        });

        it('should disconnect successfully', async () => {
            await adapter.disconnect();
            expect(adapter.isConnected()).toBe(false);
        });
    });

    describe('user operations', () => {
        it('should create a user', async () => {
            const user = await adapter.createUser({
                email: 'test@example.com',
                fullName: 'Test User',
            });

            expect(user.id).toBeDefined();
            expect(user.email).toBe('test@example.com');
            expect(user.fullName).toBe('Test User');
            expect(user.createdAt).toBeInstanceOf(Date);
        });

        it('should find user by id', async () => {
            const created = await adapter.createUser({
                email: 'test@example.com',
                fullName: 'Test User',
            });

            const found = await adapter.findUser(created.id);
            expect(found).toEqual(created);
        });

        it('should find user by email', async () => {
            const created = await adapter.createUser({
                email: 'test@example.com',
                fullName: 'Test User',
            });

            const found = await adapter.findUserByEmail('test@example.com');
            expect(found).toEqual(created);
        });

        it('should return null for non-existent user', async () => {
            const found = await adapter.findUser('non-existent-id');
            expect(found).toBeNull();
        });

        it('should update user', async () => {
            const created = await adapter.createUser({
                email: 'test@example.com',
                fullName: 'Test User',
            });

            const updated = await adapter.updateUser(created.id, {
                fullName: 'Updated Name',
            });

            expect(updated?.fullName).toBe('Updated Name');
            expect(updated?.email).toBe('test@example.com');
        });

        it('should delete user', async () => {
            const created = await adapter.createUser({
                email: 'test@example.com',
                fullName: 'Test User',
            });

            const deleted = await adapter.deleteUser(created.id);
            expect(deleted).toBe(true);

            const found = await adapter.findUser(created.id);
            expect(found).toBeNull();
        });
    });

    describe('health data operations', () => {
        let userId: string;

        beforeEach(async () => {
            const user = await adapter.createUser({
                email: 'health@example.com',
                fullName: 'Health User',
            });
            userId = user.id;
        });

        it('should save health data', async () => {
            const healthData = await adapter.saveHealthData({
                userId,
                source: 'oura_ring',
                type: 'heart_rate',
                value: 72,
                unit: 'bpm',
                timestamp: new Date(),
            });

            expect(healthData.id).toBeDefined();
            expect(healthData.value).toBe(72);
        });

        it('should save batch health data', async () => {
            const batch = await adapter.saveHealthDataBatch([
                {
                    userId,
                    source: 'oura_ring',
                    type: 'heart_rate',
                    value: 72,
                    unit: 'bpm',
                    timestamp: new Date(),
                },
                {
                    userId,
                    source: 'oura_ring',
                    type: 'steps',
                    value: 5000,
                    unit: 'steps',
                    timestamp: new Date(),
                },
            ]);

            expect(batch).toHaveLength(2);
        });

        it('should get health data by date range', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            await adapter.saveHealthData({
                userId,
                source: 'oura_ring',
                type: 'heart_rate',
                value: 72,
                unit: 'bpm',
                timestamp: now,
            });

            await adapter.saveHealthData({
                userId,
                source: 'oura_ring',
                type: 'heart_rate',
                value: 75,
                unit: 'bpm',
                timestamp: twoDaysAgo,
            });

            const range: DateRange = { start: yesterday, end: now };
            const data = await adapter.getHealthData(userId, range);

            expect(data).toHaveLength(1);
            expect(data[0].value).toBe(72);
        });

        it('should get latest health data by type', async () => {
            const now = new Date();
            const earlier = new Date(now.getTime() - 1000);

            await adapter.saveHealthData({
                userId,
                source: 'oura_ring',
                type: 'heart_rate',
                value: 70,
                unit: 'bpm',
                timestamp: earlier,
            });

            await adapter.saveHealthData({
                userId,
                source: 'oura_ring',
                type: 'heart_rate',
                value: 75,
                unit: 'bpm',
                timestamp: now,
            });

            const latest = await adapter.getLatestHealthData(userId, 'heart_rate');
            expect(latest?.value).toBe(75);
        });
    });

    describe('health goal operations', () => {
        let userId: string;

        beforeEach(async () => {
            const user = await adapter.createUser({
                email: 'goal@example.com',
                fullName: 'Goal User',
            });
            userId = user.id;
        });

        it('should create health goal', async () => {
            const goal = await adapter.createHealthGoal({
                userId,
                type: 'steps',
                target: 10000,
                unit: 'steps',
            });

            expect(goal.id).toBeDefined();
            expect(goal.target).toBe(10000);
        });

        it('should get health goals for user', async () => {
            await adapter.createHealthGoal({
                userId,
                type: 'steps',
                target: 10000,
                unit: 'steps',
            });

            const goals = await adapter.getHealthGoals(userId);
            expect(goals).toHaveLength(1);
        });

        it('should delete health goal', async () => {
            const goal = await adapter.createHealthGoal({
                userId,
                type: 'steps',
                target: 10000,
                unit: 'steps',
            });

            const deleted = await adapter.deleteHealthGoal(goal.id);
            expect(deleted).toBe(true);

            const goals = await adapter.getHealthGoals(userId);
            expect(goals).toHaveLength(0);
        });
    });
});
