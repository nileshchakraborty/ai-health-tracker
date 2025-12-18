import { HealthData, HealthDataSource, HealthDataType } from '@/entities';

/**
 * HealthDataPort - Port interface for health data collection
 * 
 * This defines the contract that all health data adapters must implement.
 * Allows switching between Bluetooth (Oura), Apple HealthKit, API-based sources.
 */
export interface HealthDataPort {
    /**
     * Connect to the health data source
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the health data source
     */
    disconnect(): Promise<void>;

    /**
     * Check if connected to the health data source
     */
    isConnected(): boolean;

    /**
     * Read all available health data from the source
     * @returns Array of health data points
     */
    readData(): Promise<HealthData[]>;

    /**
     * Read specific type of health data
     * @param type - Type of health data to read
     * @returns Array of health data points
     */
    readDataByType(type: HealthDataType): Promise<HealthData[]>;

    /**
     * Push health data to Apple Health (if supported)
     * @param data - Health data to push
     */
    pushToAppleHealth(data: HealthData[]): Promise<void>;

    /**
     * Get the source name
     */
    getSourceName(): HealthDataSource;

    /**
     * Get supported data types for this source
     */
    getSupportedTypes(): HealthDataType[];

    /**
     * Check if the source supports writing to Apple Health
     */
    supportsAppleHealthPush(): boolean;
}

/**
 * Bluetooth-specific interface for BLE health devices
 */
export interface BluetoothHealthDevice extends HealthDataPort {
    /**
     * Scan for nearby devices
     * @param timeoutMs - Scan timeout in milliseconds
     * @returns Array of discovered device IDs
     */
    scan(timeoutMs?: number): Promise<BluetoothDevice[]>;

    /**
     * Connect to a specific device by ID
     * @param deviceId - Device identifier
     */
    connectToDevice(deviceId: string): Promise<void>;

    /**
     * Get battery level of connected device
     */
    getBatteryLevel(): Promise<number | null>;
}

export interface BluetoothDevice {
    id: string;
    name: string;
    rssi: number;
}
