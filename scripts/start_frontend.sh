#!/bin/bash
#
# AIDOC Frontend Starter
# Starts the mobile app (Expo)
#

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║          AIDOC Frontend Starter                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check backend
check_backend() {
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is running"
    else
        echo -e "${YELLOW}⚠${NC} Backend is not running at http://localhost:3000"
        echo "  Start with: ./scripts/start_backend.sh"
        echo ""
    fi
}

# Kill existing Expo process
cleanup_ports() {
    echo "Cleaning up ports..."
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
}

# Install dependencies if needed
check_deps() {
    if [ ! -d "mobile/node_modules" ]; then
        echo "Installing mobile dependencies..."
        cd mobile && npm install && cd ..
    fi
}

# Start Expo
start_expo() {
    echo ""
    echo -e "${GREEN}→${NC} Starting Expo development server..."
    echo ""
    
    cd mobile
    npx expo start
}

# Main
cd "$(dirname "$0")/.."

check_backend
cleanup_ports
check_deps
start_expo
