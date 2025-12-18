#!/usr/bin/env tsx
/**
 * gRPC Server Standalone Runner
 * 
 * Runs the gRPC server separately from Next.js.
 * 
 * Usage:
 *   npx tsx scripts/start-grpc.ts [port]
 * 
 * Example:
 *   npx tsx scripts/start-grpc.ts 50051
 */

import { startGrpcServer } from '../src/grpc';

const port = parseInt(process.argv[2] || '50051', 10);

async function main() {
    try {
        const server = await startGrpcServer(port);
        console.log(`
╔════════════════════════════════════════════════╗
║          AIDOC gRPC Server Started             ║
╠════════════════════════════════════════════════╣
║  Port: ${port}                                   ║
║                                                ║
║  Services:                                     ║
║    • HealthDataService                         ║
║    • UserService                               ║
║    • AIService                                 ║
╚════════════════════════════════════════════════╝
`);

        // Handle shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down gRPC server...');
            server.forceShutdown();
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start gRPC server:', error);
        process.exit(1);
    }
}

main();
