#!/bin/bash
# Test Suite Runner
# Runs all test suites: unit, integration, feature, frontend

set -e

echo "🧪 AIDOC Test Suite Runner"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend Unit Tests
echo -e "${BLUE}📦 Running Backend Unit Tests...${NC}"
npm test -- --run 2>&1 | tail -5
echo ""

# Mobile Unit Tests
echo -e "${BLUE}📱 Running Mobile Unit Tests...${NC}"
cd mobile && ./node_modules/.bin/jest --silent 2>&1 | tail -5
cd ..
echo ""

# Integration Tests (requires backend running)
echo -e "${YELLOW}🔗 Running Integration Tests...${NC}"
echo "   (Skipping - requires backend on localhost:3000)"
# npm test -- --run tests/integration/
echo ""

# Feature Tests
echo -e "${GREEN}✨ Running Feature Tests...${NC}"
npm test -- --run tests/features/ 2>&1 | tail -5
echo ""

# Frontend Tests
echo -e "${BLUE}🖥️  Running Frontend Tests...${NC}"
npm test -- --run tests/frontend/ 2>&1 | tail -5
echo ""

echo "=========================="
echo -e "${GREEN}✅ All test suites completed!${NC}"
