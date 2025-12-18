import { DatabasePort } from '@/ports/database.port';
import { AIPort } from '@/ports/ai.port';
import {
    User,
    HealthData,
    HealthGoal,
    DateRange,
    HealthDataSource,
    HealthDataType
} from '@/entities';

// Context type for resolvers
export interface GraphQLContext {
    database: DatabasePort;
    ai: AIPort;
}

// Helper to convert enum values
function toSourceEnum(source: string): HealthDataSource {
    const map: Record<string, HealthDataSource> = {
        OURA_RING: 'oura_ring',
        APPLE_HEALTH: 'apple_health',
        APPLE_WATCH: 'apple_watch',
        MANUAL: 'manual',
    };
    return map[source] || 'manual';
}

function toTypeEnum(type: string): HealthDataType {
    const map: Record<string, HealthDataType> = {
        STEPS: 'steps',
        HEART_RATE: 'heart_rate',
        SLEEP_DURATION: 'sleep_duration',
        SLEEP_QUALITY: 'sleep_quality',
        HRV: 'hrv',
        CALORIES: 'calories',
        ACTIVITY_SCORE: 'activity_score',
        READINESS_SCORE: 'readiness_score',
    };
    return map[type] || 'steps';
}

function fromSourceEnum(source: HealthDataSource): string {
    const map: Record<HealthDataSource, string> = {
        oura_ring: 'OURA_RING',
        apple_health: 'APPLE_HEALTH',
        apple_watch: 'APPLE_WATCH',
        manual: 'MANUAL',
    };
    return map[source];
}

function fromTypeEnum(type: HealthDataType): string {
    const map: Record<HealthDataType, string> = {
        steps: 'STEPS',
        heart_rate: 'HEART_RATE',
        sleep_duration: 'SLEEP_DURATION',
        sleep_quality: 'SLEEP_QUALITY',
        hrv: 'HRV',
        calories: 'CALORIES',
        activity_score: 'ACTIVITY_SCORE',
        readiness_score: 'READINESS_SCORE',
    };
    return map[type];
}

// Transform entity to GraphQL response
function transformHealthData(data: HealthData) {
    return {
        ...data,
        source: fromSourceEnum(data.source),
        type: fromTypeEnum(data.type),
    };
}

export const resolvers = {
    // Custom scalars
    DateTime: {
        __parseValue(value: string): Date {
            return new Date(value);
        },
        __serialize(value: Date): string {
            return value.toISOString();
        },
    },

    JSON: {
        __parseValue(value: unknown): unknown {
            return value;
        },
        __serialize(value: unknown): unknown {
            return value;
        },
    },

    Query: {
        user: async (
            _: unknown,
            { id }: { id: string },
            { database }: GraphQLContext
        ): Promise<User | null> => {
            return database.findUser(id);
        },

        userByEmail: async (
            _: unknown,
            { email }: { email: string },
            { database }: GraphQLContext
        ): Promise<User | null> => {
            return database.findUserByEmail(email);
        },

        healthData: async (
            _: unknown,
            { userId, range }: { userId: string; range: { start: Date; end: Date } },
            { database }: GraphQLContext
        ) => {
            const data = await database.getHealthData(userId, range);
            return data.map(transformHealthData);
        },

        healthDataByType: async (
            _: unknown,
            { userId, type, range }: { userId: string; type: string; range: DateRange },
            { database }: GraphQLContext
        ) => {
            const data = await database.getHealthDataByType(userId, toTypeEnum(type), range);
            return data.map(transformHealthData);
        },

        latestHealthData: async (
            _: unknown,
            { userId, type }: { userId: string; type: string },
            { database }: GraphQLContext
        ) => {
            const data = await database.getLatestHealthData(userId, toTypeEnum(type));
            return data ? transformHealthData(data) : null;
        },

        healthGoals: async (
            _: unknown,
            { userId }: { userId: string },
            { database }: GraphQLContext
        ): Promise<HealthGoal[]> => {
            return database.getHealthGoals(userId);
        },

        aiInsights: async (
            _: unknown,
            { userId }: { userId: string },
            { database, ai }: GraphQLContext
        ): Promise<string | null> => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const healthData = await database.getHealthData(userId, { start: weekAgo, end: now });

            if (healthData.length === 0) {
                return null;
            }

            return ai.getInsights(healthData);
        },
    },

    Mutation: {
        createUser: async (
            _: unknown,
            { input }: { input: { email: string; fullName: string; avatarUrl?: string } },
            { database }: GraphQLContext
        ): Promise<User> => {
            return database.createUser(input);
        },

        updateUser: async (
            _: unknown,
            { id, fullName, avatarUrl }: { id: string; fullName?: string; avatarUrl?: string },
            { database }: GraphQLContext
        ): Promise<User | null> => {
            return database.updateUser(id, { fullName, avatarUrl });
        },

        saveHealthData: async (
            _: unknown,
            { input }: {
                input: {
                    userId: string;
                    source: string;
                    type: string;
                    value: number;
                    unit: string;
                    timestamp: Date;
                    metadata?: Record<string, unknown>;
                }
            },
            { database }: GraphQLContext
        ) => {
            const data = await database.saveHealthData({
                userId: input.userId,
                source: toSourceEnum(input.source),
                type: toTypeEnum(input.type),
                value: input.value,
                unit: input.unit,
                timestamp: input.timestamp,
                metadata: input.metadata,
            });
            return transformHealthData(data);
        },

        saveHealthDataBatch: async (
            _: unknown,
            { inputs }: {
                inputs: Array<{
                    userId: string;
                    source: string;
                    type: string;
                    value: number;
                    unit: string;
                    timestamp: Date;
                    metadata?: Record<string, unknown>;
                }>
            },
            { database }: GraphQLContext
        ) => {
            const dataArray = inputs.map(input => ({
                userId: input.userId,
                source: toSourceEnum(input.source),
                type: toTypeEnum(input.type),
                value: input.value,
                unit: input.unit,
                timestamp: input.timestamp,
                metadata: input.metadata,
            }));
            const results = await database.saveHealthDataBatch(dataArray);
            return results.map(transformHealthData);
        },

        createHealthGoal: async (
            _: unknown,
            { input }: { input: { userId: string; type: string; target: number; unit: string } },
            { database }: GraphQLContext
        ): Promise<HealthGoal> => {
            return database.createHealthGoal({
                userId: input.userId,
                type: toTypeEnum(input.type),
                target: input.target,
                unit: input.unit,
            });
        },

        deleteHealthGoal: async (
            _: unknown,
            { id }: { id: string },
            { database }: GraphQLContext
        ): Promise<boolean> => {
            return database.deleteHealthGoal(id);
        },
    },

    User: {
        healthData: async (
            parent: User,
            { range }: { range?: DateRange },
            { database }: GraphQLContext
        ) => {
            const now = new Date();
            const defaultRange = range || {
                start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                end: now
            };
            const data = await database.getHealthData(parent.id, defaultRange);
            return data.map(transformHealthData);
        },

        goals: async (
            parent: User,
            _: unknown,
            { database }: GraphQLContext
        ): Promise<HealthGoal[]> => {
            return database.getHealthGoals(parent.id);
        },

        latestMetrics: async (
            parent: User,
            _: unknown,
            { database }: GraphQLContext
        ) => {
            const types: HealthDataType[] = [
                'steps', 'heart_rate', 'sleep_duration',
                'sleep_quality', 'hrv', 'readiness_score'
            ];

            const metrics: Record<string, ReturnType<typeof transformHealthData> | null> = {};

            for (const type of types) {
                const data = await database.getLatestHealthData(parent.id, type);
                const camelKey = type.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                metrics[camelKey] = data ? transformHealthData(data) : null;
            }

            return metrics;
        },
    },
};
