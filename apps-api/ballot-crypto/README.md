# PPLE Today Ballot Crypto API

PPLE Today Ballot Crypto API

## Technology Stack

- [Node.js](https://nodejs.org/)
- [Elysia](https://elysiajs.com/)

## Prerequisites

- Node.js (v22.17.0 or later)
- bun (v1.4.1 or later)

## Project Setup

1. Install dependencies

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and fill in the required environment variables.

   ```bash
   cp .env.example .env
   ```

3. Start the application

   ```bash
   bun run dev
   ```

## API Documentation

- Swagger UI is available at endpoint `/swagger`

## Building for Production

To build the application for production, run:

```bash
bun run build
```
