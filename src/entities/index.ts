/**
 * User Entity
 * Core domain entity representing a user in the system
 */
export interface User {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Health Data Entity
 * Core domain entity representing a health metric
 */
export interface HealthData {
    id: string;
    userId: string;
    source: HealthDataSource;
    type: HealthDataType;
    value: number;
    unit: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export type HealthDataSource =
    | 'oura_ring'
    | 'apple_health'
    | 'apple_watch'
    | 'manual';

export type HealthDataType =
    | 'steps'
    | 'heart_rate'
    | 'sleep_duration'
    | 'sleep_quality'
    | 'hrv'
    | 'calories'
    | 'activity_score'
    | 'readiness_score';

/**
 * Date Range for querying health data
 */
export interface DateRange {
    start: Date;
    end: Date;
}

/**
 * Chat Message Entity
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

/**
 * Health Goal Entity
 */
export interface HealthGoal {
    id: string;
    userId: string;
    type: HealthDataType;
    target: number;
    unit: string;
    createdAt: Date;
}
