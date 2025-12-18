import { DatabasePort } from '@/ports/database.port';
import { User, HealthData, DateRange, HealthGoal } from '@/entities';

/**
 * InMemoryDatabaseAdapter
 * 
 * In-memory implementation of DatabasePort for development and testing.
 * Uses Map for O(1) lookups. Data is not persisted between restarts.
 */
export class InMemoryDatabaseAdapter implements DatabasePort {
    private users: Map<string, User> = new Map();
    private healthData: Map<string, HealthData> = new Map();
    private healthGoals: Map<string, HealthGoal> = new Map();
    private connected: boolean = false;

    // Connection management
    async connect(): Promise<void> {
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    // User operations
    async findUser(id: string): Promise<User | null> {
        return this.users.get(id) || null;
    }

    async findUserByEmail(email: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }

    async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        const now = new Date();
        const user: User = {
            ...userData,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now,
        };
        this.users.set(user.id, user);
        return user;
    }

    async updateUser(id: string, data: Partial<User>): Promise<User | null> {
        const user = this.users.get(id);
        if (!user) return null;

        const updated: User = {
            ...user,
            ...data,
            id: user.id, // Prevent ID change
            updatedAt: new Date(),
        };
        this.users.set(id, updated);
        return updated;
    }

    async deleteUser(id: string): Promise<boolean> {
        return this.users.delete(id);
    }

    // Health data operations
    async saveHealthData(data: Omit<HealthData, 'id'>): Promise<HealthData> {
        const healthData: HealthData = {
            ...data,
            id: this.generateId(),
        };
        this.healthData.set(healthData.id, healthData);
        return healthData;
    }

    async saveHealthDataBatch(dataArray: Omit<HealthData, 'id'>[]): Promise<HealthData[]> {
        return Promise.all(dataArray.map((data) => this.saveHealthData(data)));
    }

    async getHealthData(userId: string, range: DateRange): Promise<HealthData[]> {
        const results: HealthData[] = [];
        for (const data of this.healthData.values()) {
            if (
                data.userId === userId &&
                data.timestamp >= range.start &&
                data.timestamp <= range.end
            ) {
                results.push(data);
            }
        }
        return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    async getHealthDataByType(
        userId: string,
        type: string,
        range: DateRange
    ): Promise<HealthData[]> {
        const allData = await this.getHealthData(userId, range);
        return allData.filter((data) => data.type === type);
    }

    async getLatestHealthData(userId: string, type: string): Promise<HealthData | null> {
        let latest: HealthData | null = null;
        for (const data of this.healthData.values()) {
            if (
                data.userId === userId &&
                data.type === type &&
                (!latest || data.timestamp > latest.timestamp)
            ) {
                latest = data;
            }
        }
        return latest;
    }

    // Health goal operations
    async createHealthGoal(goalData: Omit<HealthGoal, 'id' | 'createdAt'>): Promise<HealthGoal> {
        const goal: HealthGoal = {
            ...goalData,
            id: this.generateId(),
            createdAt: new Date(),
        };
        this.healthGoals.set(goal.id, goal);
        return goal;
    }

    async getHealthGoals(userId: string): Promise<HealthGoal[]> {
        const results: HealthGoal[] = [];
        for (const goal of this.healthGoals.values()) {
            if (goal.userId === userId) {
                results.push(goal);
            }
        }
        return results;
    }

    async deleteHealthGoal(id: string): Promise<boolean> {
        return this.healthGoals.delete(id);
    }

    // Helper
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // For testing: clear all data
    clear(): void {
        this.users.clear();
        this.healthData.clear();
        this.healthGoals.clear();
    }
}
