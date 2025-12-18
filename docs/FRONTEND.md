# Frontend Documentation

## Overview

Web frontend built with Next.js 14 and React 18.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: GraphQL + SSE
- **Testing**: Vitest + React Testing Library

## Structure

```
app/
├── layout.tsx        # Root layout with dark theme
├── page.tsx          # Landing page with hero
├── globals.css       # Tailwind + custom styles
└── api/
    ├── graphql/      # Apollo Server endpoint
    │   └── route.ts
    ├── chat/         # SSE streaming endpoint
    │   └── route.ts
    └── health/       # Health check
        └── route.ts
```

## API Integration

### GraphQL
```typescript
// Fetch user data
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `query { user(id: "...") { email healthData { type value } } }`
  })
});
```

### SSE Chat
```typescript
// Stream chat response
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
});

const reader = response.body.getReader();
// Process SSE stream...
```

## Styling

Using Tailwind CSS with custom health-focused theme:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: { /* green palette */ }
    }
  }
}
```

## Development

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # Run linter
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Health dashboard (planned) |
| `/account` | Account settings (planned) |
