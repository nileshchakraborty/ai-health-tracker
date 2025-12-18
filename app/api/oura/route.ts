/**
 * Oura Data API Route
 * 
 * Fetches health data from Oura Cloud API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OuraCloudAdapter } from '@/adapters/health';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const accessToken = process.env.OURA_ACCESS_TOKEN;

    if (!accessToken) {
        return NextResponse.json(
            {
                error: 'Oura access token not configured',
                hint: 'Add OURA_ACCESS_TOKEN to your .env file. Get one from https://cloud.ouraring.com/personal-access-tokens'
            },
            { status: 503 }
        );
    }

    try {
        const adapter = new OuraCloudAdapter({ accessToken });
        await adapter.connect();

        const readings = await adapter.readData(
            'current-user',
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );

        await adapter.disconnect();

        // Group readings by type for easier consumption
        const groupedData = readings.reduce((acc, reading) => {
            const type = reading.type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push({
                value: reading.value,
                unit: reading.unit,
                timestamp: reading.timestamp.toISOString(),
                metadata: reading.metadata,
            });
            return acc;
        }, {} as Record<string, any[]>);

        return NextResponse.json({
            source: 'Oura Ring',
            dataTypes: Object.keys(groupedData),
            totalReadings: readings.length,
            data: groupedData,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to fetch Oura data', details: message },
            { status: 500 }
        );
    }
}
