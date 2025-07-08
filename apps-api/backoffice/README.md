# PPLE Today Backoffice API

PPLE Today Backoffice API

## Technology Stack

- [Node.js](https://nodejs.org/)
- [Elysia](https://elysiajs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)

## Prerequisites

- Node.js (v22.17.0 or later)
- pnpm (v9.9.0 or later)

## Project Setup

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Generate Prisma client

   ```bash
   pnpm db:generate
   ```

3. If you did not start postgresql yet, you can use Docker to run it. Make sure you have Docker installed and running.:

   ```bash
   docker compose up -d
   ```

   Then, run the migrations:

   ```bash
   pnpm db:migrate
   ```

4. Copy `.env.example` to `.env` and fill in the required environment variables.

   ```bash
   cp .env.example .env
   ```

   Make sure to set the `DATABASE_URL` variable to your database connection string.

5. Start the application

   ```bash
   pnpm dev
   ```

## API Documentation

- Swagger UI is available at endpoint `/swagger`

## Building for Production

To build the application for production, run:

```bash
pnpm build
```
