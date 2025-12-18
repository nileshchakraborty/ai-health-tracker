#!/bin/bash
#
# AIDOC Backend Test Script
# Tests all API endpoints with curl commands
#
# Usage:
#   ./scripts/test-backend.sh
#
# Prerequisites:
#   - Next.js server running on port 3000
#   - Ollama running (optional, for chat tests)

set -e

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════╗"
echo "║       AIDOC Backend API Test Suite             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Track test results
PASSED=0
FAILED=0

# Helper function to run a test
run_test() {
    local name="$1"
    local expected="$2"
    shift 2
    
    echo -n "Testing: $name... "
    
    response=$(curl -s "$@")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Expected to contain: $expected"
        echo "  Got: $response"
        ((FAILED++))
    fi
}

echo "═══════════════════════════════════════════════════"
echo "REST Endpoints"
echo "═══════════════════════════════════════════════════"

# Health Check
run_test "Health Check" '"status":"ok"' \
    "$BASE_URL/health"

echo ""
echo "═══════════════════════════════════════════════════"
echo "GraphQL Mutations"
echo "═══════════════════════════════════════════════════"

# Create User
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"mutation { createUser(input: {email: \"test@example.com\", fullName: \"Test User\"}) { id email fullName } }"}')

echo -n "Testing: Create User... "
if echo "$USER_RESPONSE" | grep -q '"email":"test@example.com"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC}"
    echo "  Got: $USER_RESPONSE"
    ((FAILED++))
fi

# Extract user ID for subsequent tests
USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Created user ID: $USER_ID"

# Save Health Data
if [ -n "$USER_ID" ]; then
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    run_test "Save Health Data (Steps)" '"type":"STEPS"' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"mutation { saveHealthData(input: {userId: \\\"$USER_ID\\\", source: OURA_RING, type: STEPS, value: 5000, unit: \\\"steps\\\", timestamp: \\\"$TIMESTAMP\\\"}) { id type value unit } }\"}"
    
    run_test "Save Health Data (Heart Rate)" '"type":"HEART_RATE"' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"mutation { saveHealthData(input: {userId: \\\"$USER_ID\\\", source: APPLE_WATCH, type: HEART_RATE, value: 72, unit: \\\"bpm\\\", timestamp: \\\"$TIMESTAMP\\\"}) { id type value unit } }\"}"
    
    run_test "Save Health Data (Sleep)" '"type":"SLEEP_DURATION"' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"mutation { saveHealthData(input: {userId: \\\"$USER_ID\\\", source: OURA_RING, type: SLEEP_DURATION, value: 7.5, unit: \\\"hours\\\", timestamp: \\\"$TIMESTAMP\\\"}) { id type value unit } }\"}"

    # Create Health Goal
    run_test "Create Health Goal" '"target":10000' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"mutation { createHealthGoal(input: {userId: \\\"$USER_ID\\\", type: STEPS, target: 10000, unit: \\\"steps\\\"}) { id type target unit } }\"}"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "GraphQL Queries"
echo "═══════════════════════════════════════════════════"

if [ -n "$USER_ID" ]; then
    run_test "Get User" '"fullName":"Test User"' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"query { user(id: \\\"$USER_ID\\\") { id email fullName } }\"}"
    
    run_test "Get Health Goals" '"goals"' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"query { healthGoals(userId: \\\"$USER_ID\\\") { id type target } }\"}"
    
    # Get Health Data with date range
    START_DATE=$(date -u -v-7d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%dT%H:%M:%SZ")
    END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    run_test "Get Health Data (Date Range)" '"healthData"' \
        -X POST "$BASE_URL/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"query { healthData(userId: \\\"$USER_ID\\\", range: {start: \\\"$START_DATE\\\", end: \\\"$END_DATE\\\"}) { type value unit } }\"}"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "SSE Chat Endpoint"
echo "═══════════════════════════════════════════════════"

# Chat endpoint info
run_test "Chat Endpoint Info" '"messages"' \
    "$BASE_URL/chat"

# SSE Chat (check for either response or unavailable)
echo -n "Testing: SSE Chat Stream... "
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/chat" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Hello"}]}' \
    --max-time 10 2>/dev/null || echo "timeout")

if echo "$CHAT_RESPONSE" | grep -q "data:"; then
    echo -e "${GREEN}PASSED${NC} (Streaming working)"
    ((PASSED++))
elif echo "$CHAT_RESPONSE" | grep -q "AI service unavailable"; then
    echo -e "${YELLOW}SKIPPED${NC} (Ollama not running)"
else
    echo -e "${RED}FAILED${NC}"
    echo "  Got: $CHAT_RESPONSE"
    ((FAILED++))
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "Test Summary"
echo "═══════════════════════════════════════════════════"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
