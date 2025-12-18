import { User, HealthData, DateRange, HealthGoal } from '@/entities';

/**
 * DatabasePort - Port interface for database operations
 * 
 * This defines the contract that all database adapters must implement.
 * Allows switching between in-memory, SQLite, PostgreSQL without changing business logic.
 */
export interface DatabasePort {
    // User operations
    findUser(id: string): Promise<User | null>;
    findUserByEmail(email: string): Promise<User | null>;
    createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
    updateUser(id: string, data: Partial<User>): Promise<User | null>;
    deleteUser(id: string): Promise<boolean>;

    // Health data operations
    saveHealthData(data: Omit<HealthData, 'id'>): Promise<HealthData>;
    saveHealthDataBatch(data: Omit<HealthData, 'id'>[]): Promise<HealthData[]>;
    getHealthData(userId: string, range: DateRange): Promise<HealthData[]>;
    getHealthDataByType(userId: string, type: string, range: DateRange): Promise<HealthData[]>;
    getLatestHealthData(userId: string, type: string): Promise<HealthData | null>;

    // Health goal operations
    createHealthGoal(goal: Omit<HealthGoal, 'id' | 'createdAt'>): Promise<HealthGoal>;
    getHealthGoals(userId: string): Promise<HealthGoal[]>;
    deleteHealthGoal(id: string): Promise<boolean>;

    // Connection management
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
