# PPLE Today Backoffice API

PPLE Today Backoffice API

## Technology Stack

- [Node.js](https://nodejs.org/)
- [Elysia](https://elysiajs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)

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

   Make sure to set the `DATABASE_URL` variable to your database connection string.

3. Generate Prisma client

   ```bash
   bun run db:generate
   ```

4. If you did not start postgresql yet, you can use Docker to run it. Make sure you have Docker installed and running.:

   ```bash
   docker compose up -d
   ```

   Then, run the migrations:

   ```bash
   bun run db:migrate
   ```

5. Start the application

   ```bash
   bun run dev
   ```

   This starts the backoffice API (port **2000**) and the mini app redirect server (port **2002**, `MINIAPP_REDIRECT_PORT`) in the same process. Example: `https://miniapp.peoplesparty.or.th/abc/app-path?query=params` redirects to `{miniApp.clientUrl}/app-path?query=params`.

   When `MINIAPP_IOS_*` and `MINIAPP_ANDROID_*` env vars are set, the redirect host also serves Universal Link / App Link verification files:

   - `/.well-known/apple-app-site-association`
   - `/.well-known/assetlinks.json`

   See [mobile DEEPLINKING.md](../../apps-client/mobile/DEEPLINKING.md) for Apple Developer, App Store Connect, and Play Console setup.

## API Documentation

- Swagger UI is available at endpoint `/swagger`

## Building for Production

To build the application for production, run:

```bash
bun run build
```
