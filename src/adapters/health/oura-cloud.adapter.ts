/**
 * Oura Cloud API Adapter
 * 
 * Fetches health data from Oura Ring via the official Cloud API.
 * Uses Personal Access Token for authentication.
 * 
 * API Docs: https://cloud.ouraring.com/v2/docs
 */

import { HealthDataPort } from '@/ports/health-data.port';
import { HealthData, HealthDataSource, HealthDataType } from '@/entities';

interface OuraConfig {
    accessToken: string;
    baseUrl?: string;
}

interface OuraSleepData {
    id: string;
    day: string;
    total_sleep_duration: number;
    efficiency: number;
    deep_sleep_duration: number;
    rem_sleep_duration: number;
    light_sleep_duration: number;
    average_heart_rate: number;
    average_hrv: number;
    lowest_heart_rate: number;
}

interface OuraActivityData {
    id: string;
    day: string;
    steps: number;
    active_calories: number;
    total_calories: number;
    high_activity_time: number;
    medium_activity_time: number;
    low_activity_time: number;
}

interface OuraReadinessData {
    id: string;
    day: string;
    score: number;
    temperature_deviation: number;
}

interface OuraHeartRateData {
    bpm: number;
    source: string;
    timestamp: string;
}

export class OuraCloudAdapter implements HealthDataPort {
    private accessToken: string;
    private baseUrl: string;
    private connected: boolean = false;
    private cachedData: HealthData[] = [];
    private startDate?: Date;
    private endDate?: Date;

    constructor(configOptions?: OuraConfig) {
        this.accessToken = configOptions?.accessToken || process.env.OURA_ACCESS_TOKEN || '';
        this.baseUrl = configOptions?.baseUrl || 'https://api.ouraring.com/v2';
    }

    /**
     * Set date range for data fetching
     */
    setDateRange(start: Date, end: Date): void {
        this.startDate = start;
        this.endDate = end;
    }

    async connect(): Promise<void> {
        if (!this.accessToken) {
            throw new Error('Oura access token not configured. Set OURA_ACCESS_TOKEN in .env');
        }

        // Validate token by making a test request
        const response = await fetch(`${this.baseUrl}/usercollection/personal_info`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Oura API connection failed: ${response.statusText}`);
        }

        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        this.cachedData = [];
    }

    isConnected(): boolean {
        return this.connected;
    }

    getSourceName(): HealthDataSource {
        return 'oura_ring';
    }

    getSupportedTypes(): HealthDataType[] {
        return [
            'steps',
            'heart_rate',
            'sleep_duration',
            'sleep_quality',
            'hrv',
            'calories',
            'activity_score',
            'readiness_score',
        ];
    }

    supportsAppleHealthPush(): boolean {
        return false;
    }

    async pushToAppleHealth(_data: HealthData[]): Promise<void> {
        console.warn('Oura Cloud API does not support pushing to Apple Health directly');
    }

    async readData(): Promise<HealthData[]> {
        const start = this.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = this.endDate || new Date();
        const dateParams = `start_date=${this.formatDate(start)}&end_date=${this.formatDate(end)}`;

        const readings: HealthData[] = [];

        // Fetch all data types in parallel
        const [sleepData, activityData, readinessData, heartRateData] = await Promise.all([
            this.fetchSleepData(dateParams),
            this.fetchActivityData(dateParams),
            this.fetchReadinessData(dateParams),
            this.fetchHeartRateData(dateParams),
        ]);

        // Transform sleep data
        for (const sleep of sleepData) {
            readings.push(this.createHealthData(
                'sleep_duration',
                sleep.total_sleep_duration / 3600,
                'hours',
                new Date(sleep.day)
            ));

            readings.push(this.createHealthData(
                'sleep_quality',
                sleep.efficiency,
                'percent',
                new Date(sleep.day)
            ));

            if (sleep.average_hrv) {
                readings.push(this.createHealthData(
                    'hrv',
                    sleep.average_hrv,
                    'ms',
                    new Date(sleep.day)
                ));
            }

            if (sleep.average_heart_rate) {
                readings.push(this.createHealthData(
                    'heart_rate',
                    sleep.average_heart_rate,
                    'bpm',
                    new Date(sleep.day),
                    { context: 'sleep_average' }
                ));
            }
        }

        // Transform activity data
        for (const activity of activityData) {
            readings.push(this.createHealthData(
                'steps',
                activity.steps,
                'steps',
                new Date(activity.day)
            ));

            readings.push(this.createHealthData(
                'calories',
                activity.total_calories,
                'kcal',
                new Date(activity.day)
            ));

            readings.push(this.createHealthData(
                'activity_score',
                activity.high_activity_time + activity.medium_activity_time + activity.low_activity_time,
                'minutes',
                new Date(activity.day),
                { context: 'active_time' }
            ));
        }

        // Transform readiness data
        for (const readiness of readinessData) {
            readings.push(this.createHealthData(
                'readiness_score',
                readiness.score,
                'score',
                new Date(readiness.day)
            ));
        }

        // Transform heart rate data (5-minute intervals) - limit to latest 100
        for (const hr of heartRateData.slice(-100)) {
            readings.push(this.createHealthData(
                'heart_rate',
                hr.bpm,
                'bpm',
                new Date(hr.timestamp),
                { source: hr.source }
            ));
        }

        this.cachedData = readings;
        return readings;
    }

    async readDataByType(type: HealthDataType): Promise<HealthData[]> {
        if (this.cachedData.length === 0) {
            await this.readData();
        }
        return this.cachedData.filter(d => d.type === type);
    }

    // Private helpers

    private createHealthData(
        type: HealthDataType,
        value: number,
        unit: string,
        timestamp: Date,
        metadata?: Record<string, string>
    ): HealthData {
        return {
            id: `oura-${type}-${timestamp.getTime()}`,
            userId: 'oura-user',
            source: 'oura_ring',
            type,
            value,
            unit,
            timestamp,
            metadata,
        };
    }

    private getHeaders(): HeadersInit {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
        };
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private async fetchSleepData(dateParams: string): Promise<OuraSleepData[]> {
        try {
            const response = await fetch(`${this.baseUrl}/usercollection/daily_sleep?${dateParams}`, {
                headers: this.getHeaders(),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching sleep data:', error);
            return [];
        }
    }

    private async fetchActivityData(dateParams: string): Promise<OuraActivityData[]> {
        try {
            const response = await fetch(`${this.baseUrl}/usercollection/daily_activity?${dateParams}`, {
                headers: this.getHeaders(),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching activity data:', error);
            return [];
        }
    }

    private async fetchReadinessData(dateParams: string): Promise<OuraReadinessData[]> {
        try {
            const response = await fetch(`${this.baseUrl}/usercollection/daily_readiness?${dateParams}`, {
                headers: this.getHeaders(),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching readiness data:', error);
            return [];
        }
    }

    private async fetchHeartRateData(dateParams: string): Promise<OuraHeartRateData[]> {
        try {
            const response = await fetch(`${this.baseUrl}/usercollection/heartrate?${dateParams}`, {
                headers: this.getHeaders(),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching heart rate data:', error);
            return [];
        }
    }
}

export default OuraCloudAdapter;
