# BloomThis API - Hono Local Server

Converted from AWS Lambda to local Hono server.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your actual configuration
```

3. Start development server:
```bash
pnpm dev
```

## API Endpoints

- `POST /api/bt-json` - Main endpoint for database operations
- `GET /health` - Health check

## Environment Variables

See `.env.example` for required configuration.

## Changes from Lambda

- Replaced AWS SNS with direct HTTP calls and console logging
- Added CORS middleware for local development
- Converted callback-based Lambda handler to async/await Hono routes
- Added proper error handling and response formatting