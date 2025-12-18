# AIDOC - AI Health Tracker

Privacy-first AI health assistant with local AI and wearable integration.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Ollama (for AI)
ollama serve
ollama pull llama3.2

# 3. Copy env and start
cp .env.example .env
npm run dev
```

**That's it!** Open http://localhost:3000

## Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| 💬 AI Chat | ✅ Works | Chat with local Ollama AI |
| 📊 GraphQL | ✅ Works | Query health data |
| 💍 Oura Ring | ✅ Works | Cloud API integration |
| 📱 Mobile | ✅ Works | React Native / Expo |

## Feature Flags (Advanced)

Enable in `.env`:

```bash
# Multi-provider AI with fallbacks
ENABLE_LITELLM=true

# Resilience (circuit breakers)
ENABLE_CIRCUIT_BREAKER=true

# gRPC for mobile
ENABLE_GRPC=true
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/graphql` | GraphQL queries |
| `/api/chat` | AI chat (SSE) |
| `/api/health` | Health check |
| `/api/oura` | Oura Ring data |

## Running Tests

```bash
# All backend tests
npm test

# Mobile tests
cd mobile && npm test
```

| Tests | Count |
|-------|-------|
| Backend | 124 |
| Mobile | 41 |
| **Total** | **165** |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ADAPTER` | `ollama` | AI provider |
| `OLLAMA_MODEL` | `llama3.2` | Model name |
| `DATABASE_ADAPTER` | `memory` | Database |

## Documentation

- [Architecture](./docs/architecture.md)
- [Backend API](./docs/BACKEND.md)
- [Mobile App](./docs/MOBILE.md)
- [API Spec](./docs/swagger.yaml)

## License

MIT