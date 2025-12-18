#!/bin/bash
#
# AIDOC Backend Starter
# Starts Next.js server and gRPC server
#

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║          AIDOC Backend Starter                 ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Ollama is running
check_ollama() {
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Ollama is running"
    else
        echo -e "${YELLOW}⚠${NC} Ollama is not running. AI features won't work."
        echo "  Start with: ollama serve"
    fi
}

# Kill existing processes on ports
cleanup_ports() {
    echo "Cleaning up ports..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:50051 | xargs kill -9 2>/dev/null || true
}

# Start servers
start_servers() {
    echo ""
    echo "Starting servers..."
    echo ""
    
    # Start gRPC server in background
    echo -e "${GREEN}→${NC} Starting gRPC server on port 50051..."
    npm run grpc:serve &
    GRPC_PID=$!
    
    sleep 2
    
    # Start Next.js server
    echo -e "${GREEN}→${NC} Starting Next.js server on port 3000..."
    npm run dev &
    NEXT_PID=$!
    
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo -e "${GREEN}Servers running:${NC}"
    echo "  • Next.js (GraphQL + SSE): http://localhost:3000"
    echo "  • gRPC:                    localhost:50051"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    echo "═══════════════════════════════════════════════════"
    
    # Wait for interrupt
    trap "echo ''; echo 'Stopping servers...'; kill $GRPC_PID $NEXT_PID 2>/dev/null; exit 0" SIGINT SIGTERM
    wait
}

# Main
cd "$(dirname "$0")/.."

check_ollama
cleanup_ports
start_servers
