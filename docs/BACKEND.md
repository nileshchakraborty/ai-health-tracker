# Backend Documentation

## Overview

AIDOC Backend is a Next.js application with multi-protocol API:
- **GraphQL** - Structured queries for web
- **gRPC** - Efficient binary for mobile/watch
- **SSE** - Streaming AI responses
- **REST** - Health checks & Oura integration

## Architecture

### Hexagonal (Ports & Adapters)
```
Driving Adapters        Core              Driven Adapters
─────────────────      ──────            ─────────────────
GraphQL Route    ──▶   Ports    ──▶      LiteLLM (AI)
gRPC Server      ──▶   Use Cases ──▶     InMemoryDB
SSE Chat         ──▶              ──▶    Oura Cloud API
REST APIs        ──▶              ──▶    HealthKit
```

### Resilience Layer
| Pattern | Location | Purpose |
|---------|----------|---------|
| Circuit Breaker | `src/utils/circuit-breaker.ts` | Fail fast on outages |
| Fallbacks | LiteLLM adapter | Provider redundancy |
| Caching | LiteLLM adapter | Reduce API calls |
| Retry | `src/utils/retry.ts` | Exponential backoff |

## API Endpoints

### REST
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic health check |
| `/api/health/status` | GET | Detailed status + circuit breakers |
| `/api/oura` | GET | Oura Ring health data |
| `/api/oura/connect` | GET | Start OAuth2 |
| `/api/oura/callback` | GET | OAuth2 callback |

### GraphQL (`/api/graphql`)
```graphql
type Query {
  user(id: ID!): User
  users: [User!]!
  healthData(userId: ID!, dateRange: DateRangeInput): [HealthData!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  saveHealthData(input: HealthDataInput!): HealthData!
  createHealthGoal(input: HealthGoalInput!): HealthGoal!
}
```

### SSE Chat (`/api/chat`)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"How can I improve my sleep?"}]}'
```

### gRPC (`:50051`)
```protobuf
service HealthDataService {
  rpc SyncHealthData(stream HealthData) returns (SyncResponse);
  rpc GetHealthData(GetRequest) returns (stream HealthData);
  rpc BatchUpload(BatchRequest) returns (BatchResponse);
}

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc UpdateUser(UpdateUserRequest) returns (User);
}

service AIService {
  rpc GetInsights(InsightsRequest) returns (InsightsResponse);
  rpc Chat(ChatRequest) returns (ChatResponse);
}
```

## AI Configuration (LiteLLM)

```env
# Primary: Local Ollama
AI_ADAPTER=litellm
LITELLM_PRIMARY_MODEL=ollama/llama3.2

# Fallbacks: Cloud providers
LITELLM_FALLBACK_MODELS=openai/gpt-4o-mini,anthropic/claude-3-haiku

# Caching
LITELLM_CACHE_ENABLED=true
LITELLM_CACHE_TTL=300
```

## Running

```bash
# Development
npm run dev

# gRPC server
npm run grpc:serve

# Tests
npm test

# All tests
./scripts/run-all-tests.sh
```

## Testing

| Suite | Command | Tests |
|-------|---------|-------|
| Unit | `npm test` | 124 |
| Integration | `npm test tests/integration/` | 5 |
| Features | `npm test tests/features/` | 27 |
| Frontend | `npm test tests/frontend/` | 17 |

## Circuit Breaker States

Check via API:
```bash
curl http://localhost:3000/api/health/status | jq
```

Response includes:
```json
{
  "status": "healthy",
  "services": {
    "ai": {
      "available": true,
      "circuitBreaker": { "state": "CLOSED", "failures": 0 }
    }
  }
}
```
