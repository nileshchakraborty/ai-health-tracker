/**
 * gRPC Server Implementation
 * 
 * Provides gRPC services for mobile and watch clients.
 * Uses the same port adapters as GraphQL for consistency.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { getDatabaseAdapter, getAIAdapter } from '@/adapters/factory';
import { HealthData, HealthDataSource, HealthDataType, Message } from '@/entities';

// Proto loading options
const PROTO_PATH = path.join(process.cwd(), 'proto', 'aidoc.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const aidocProto = protoDescriptor.aidoc;

// Helper functions for enum conversion
function protoSourceToEntity(source: string): HealthDataSource {
    const map: Record<string, HealthDataSource> = {
        HEALTH_DATA_SOURCE_OURA_RING: 'oura_ring',
        HEALTH_DATA_SOURCE_APPLE_HEALTH: 'apple_health',
        HEALTH_DATA_SOURCE_APPLE_WATCH: 'apple_watch',
        HEALTH_DATA_SOURCE_MANUAL: 'manual',
    };
    return map[source] || 'manual';
}

function protoTypeToEntity(type: string): HealthDataType {
    const map: Record<string, HealthDataType> = {
        HEALTH_DATA_TYPE_STEPS: 'steps',
        HEALTH_DATA_TYPE_HEART_RATE: 'heart_rate',
        HEALTH_DATA_TYPE_SLEEP_DURATION: 'sleep_duration',
        HEALTH_DATA_TYPE_SLEEP_QUALITY: 'sleep_quality',
        HEALTH_DATA_TYPE_HRV: 'hrv',
        HEALTH_DATA_TYPE_CALORIES: 'calories',
        HEALTH_DATA_TYPE_ACTIVITY_SCORE: 'activity_score',
        HEALTH_DATA_TYPE_READINESS_SCORE: 'readiness_score',
    };
    return map[type] || 'steps';
}

function entitySourceToProto(source: HealthDataSource): string {
    const map: Record<HealthDataSource, string> = {
        oura_ring: 'HEALTH_DATA_SOURCE_OURA_RING',
        apple_health: 'HEALTH_DATA_SOURCE_APPLE_HEALTH',
        apple_watch: 'HEALTH_DATA_SOURCE_APPLE_WATCH',
        manual: 'HEALTH_DATA_SOURCE_MANUAL',
    };
    return map[source];
}

function entityTypeToProto(type: HealthDataType): string {
    const map: Record<HealthDataType, string> = {
        steps: 'HEALTH_DATA_TYPE_STEPS',
        heart_rate: 'HEALTH_DATA_TYPE_HEART_RATE',
        sleep_duration: 'HEALTH_DATA_TYPE_SLEEP_DURATION',
        sleep_quality: 'HEALTH_DATA_TYPE_SLEEP_QUALITY',
        hrv: 'HEALTH_DATA_TYPE_HRV',
        calories: 'HEALTH_DATA_TYPE_CALORIES',
        activity_score: 'HEALTH_DATA_TYPE_ACTIVITY_SCORE',
        readiness_score: 'HEALTH_DATA_TYPE_READINESS_SCORE',
    };
    return map[type];
}

function entityToProtoHealthData(data: HealthData) {
    return {
        id: data.id,
        userId: data.userId,
        source: entitySourceToProto(data.source),
        type: entityTypeToProto(data.type),
        value: data.value,
        unit: data.unit,
        timestampMs: data.timestamp.getTime().toString(),
        metadata: data.metadata || {},
    };
}

// HealthDataService implementation
const healthDataServiceHandlers = {
    // Streaming upload from device
    syncHealthData: async (
        call: grpc.ServerReadableStream<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        let syncedCount = 0;
        const failedIds: string[] = [];

        call.on('data', async (request: any) => {
            try {
                const data = request.data;
                await database.saveHealthData({
                    userId: data.userId,
                    source: protoSourceToEntity(data.source),
                    type: protoTypeToEntity(data.type),
                    value: data.value,
                    unit: data.unit,
                    timestamp: new Date(parseInt(data.timestampMs)),
                    metadata: data.metadata,
                });
                syncedCount++;
            } catch (error) {
                failedIds.push(request.data?.id || 'unknown');
            }
        });

        call.on('end', () => {
            callback(null, {
                syncedCount,
                failedIds,
                message: `Synced ${syncedCount} records`,
            });
        });

        call.on('error', (error) => {
            callback(error, null);
        });
    },

    // Stream health data to client
    getHealthData: async (
        call: grpc.ServerWritableStream<any, any>
    ) => {
        const database = getDatabaseAdapter();
        const request = call.request;

        const data = await database.getHealthData(request.userId, {
            start: new Date(parseInt(request.startTimeMs)),
            end: new Date(parseInt(request.endTimeMs)),
        });

        for (const item of data) {
            call.write(entityToProtoHealthData(item));
        }

        call.end();
    },

    // Batch upload
    batchUpload: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        const request = call.request;

        let successCount = 0;
        let failureCount = 0;
        const failedIds: string[] = [];

        for (const data of request.data) {
            try {
                await database.saveHealthData({
                    userId: data.userId,
                    source: protoSourceToEntity(data.source),
                    type: protoTypeToEntity(data.type),
                    value: data.value,
                    unit: data.unit,
                    timestamp: new Date(parseInt(data.timestampMs)),
                    metadata: data.metadata,
                });
                successCount++;
            } catch (error) {
                failureCount++;
                failedIds.push(data.id || 'unknown');
            }
        }

        callback(null, { successCount, failureCount, failedIds });
    },
};

// UserService implementation
const userServiceHandlers = {
    getUser: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        const user = await database.findUser(call.request.userId);

        if (!user) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'User not found',
            }, null);
            return;
        }

        callback(null, {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || '',
            createdAtMs: user.createdAt.getTime().toString(),
            updatedAtMs: user.updatedAt.getTime().toString(),
        });
    },

    updateUser: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        const request = call.request;

        const updated = await database.updateUser(request.userId, {
            fullName: request.fullName,
            avatarUrl: request.avatarUrl,
        });

        if (!updated) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'User not found',
            }, null);
            return;
        }

        callback(null, {
            id: updated.id,
            email: updated.email,
            fullName: updated.fullName,
            avatarUrl: updated.avatarUrl || '',
            createdAtMs: updated.createdAt.getTime().toString(),
            updatedAtMs: updated.updatedAt.getTime().toString(),
        });
    },

    getHealthGoals: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        const goals = await database.getHealthGoals(call.request.userId);

        callback(null, {
            goals: goals.map(g => ({
                id: g.id,
                userId: g.userId,
                type: entityTypeToProto(g.type),
                target: g.target,
                unit: g.unit,
                createdAtMs: g.createdAt.getTime().toString(),
            })),
        });
    },

    createHealthGoal: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        const request = call.request;

        const goal = await database.createHealthGoal({
            userId: request.userId,
            type: protoTypeToEntity(request.type),
            target: request.target,
            unit: request.unit,
        });

        callback(null, {
            id: goal.id,
            userId: goal.userId,
            type: entityTypeToProto(goal.type),
            target: goal.target,
            unit: goal.unit,
            createdAtMs: goal.createdAt.getTime().toString(),
        });
    },
};

// AIService implementation
const aiServiceHandlers = {
    getInsights: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const database = getDatabaseAdapter();
        const ai = getAIAdapter();
        const request = call.request;

        const days = request.days || 7;
        const now = new Date();
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const healthData = await database.getHealthData(request.userId, { start, end: now });

        if (healthData.length === 0) {
            callback(null, {
                insights: 'No health data available for the specified period.',
                generatedAtMs: now.getTime().toString(),
            });
            return;
        }

        try {
            const insights = await ai.getInsights(healthData);
            callback(null, {
                insights,
                generatedAtMs: Date.now().toString(),
            });
        } catch (error) {
            callback({
                code: grpc.status.UNAVAILABLE,
                message: 'AI service unavailable',
            }, null);
        }
    },

    chat: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ) => {
        const ai = getAIAdapter();
        const request = call.request;

        const messages: Message[] = request.messages.map((m: any) => ({
            role: m.role === 'CHAT_ROLE_USER' ? 'user' : m.role === 'CHAT_ROLE_ASSISTANT' ? 'assistant' : 'system',
            content: m.content,
        }));

        try {
            const response = await ai.chatSync(messages);
            callback(null, { response });
        } catch (error) {
            callback({
                code: grpc.status.UNAVAILABLE,
                message: 'AI service unavailable',
            }, null);
        }
    },
};

// Create and start gRPC server
export function createGrpcServer(): grpc.Server {
    const server = new grpc.Server();

    server.addService(aidocProto.HealthDataService.service, healthDataServiceHandlers);
    server.addService(aidocProto.UserService.service, userServiceHandlers);
    server.addService(aidocProto.AIService.service, aiServiceHandlers);

    return server;
}

export function startGrpcServer(port: number = 50051): Promise<grpc.Server> {
    return new Promise((resolve, reject) => {
        const server = createGrpcServer();

        server.bindAsync(
            `0.0.0.0:${port}`,
            grpc.ServerCredentials.createInsecure(),
            (error, boundPort) => {
                if (error) {
                    reject(error);
                    return;
                }
                console.log(`gRPC server running on port ${boundPort}`);
                resolve(server);
            }
        );
    });
}
