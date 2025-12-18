# AIDOC Runbook

## Quick Reference

| Action | Command |
|--------|---------|
| Start web server | `npm run dev` |
| Start gRPC server | `npm run grpc:serve` |
| Run unit tests | `npm test` |
| Run API tests | `./scripts/test-backend.sh` |
| Build | `npm run build` |
| Docker up | `docker-compose up` |

## Prerequisites

- Node.js 22+
- Ollama (for AI)
- Docker (optional)

## Setup

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start Ollama
ollama serve
ollama pull llama3.2
```

## Development

```bash
# Terminal 1: Next.js (port 3000)
npm run dev

# Terminal 2: gRPC (port 50051)
npm run grpc:serve

# Terminal 3: Tests (watch mode)
npm run test:watch
```

## Testing

```bash
# Unit tests (37 tests)
npm test

# Coverage report
npm run test:coverage

# Backend API tests
./scripts/test-backend.sh

# Generate test JWT
npx tsx scripts/generate-jwt.ts user123 1h
```

## Docker

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Troubleshooting

### Ollama not responding
```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart
ollama serve
```

### gRPC server issues
```bash
# Check port availability
lsof -i :50051

# Start with different port
npx tsx scripts/start-grpc.ts 50052
```

### Tests failing
```bash
npm run test -- --clearCache
```

## Monitoring

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `POST /api/graphql` | GraphQL introspection |
| `:50051` | gRPC reflection |

## Ports

| Service | Port |
|---------|------|
| Next.js | 3000 |
| gRPC | 50051 |
| Ollama | 11434 |
