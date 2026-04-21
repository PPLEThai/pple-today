# PPLE Today Backoffice API (`@api/backoffice`)

The **PPLE Today Backoffice API** is the main backend service for the PPLE Today civic-engagement platform. It exposes both public-facing REST endpoints (feeds, polls, elections, notifications, etc.) and protected admin endpoints used by the CMS dashboard. Authentication is handled via OAuth2/OIDC with JWT bearer tokens.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Node.js](https://nodejs.org/) ≥ 22 |
| Web framework | [Elysia](https://elysiajs.com/) |
| ORM | [Prisma](https://www.prisma.io/) v6 |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| Auth | OAuth2 / OIDC + JWT ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)) |
| File storage | Google Cloud Storage |
| Push notifications | Firebase Cloud Messaging |
| Social integration | Facebook Graph API v23.0 |
| API docs | [Scalar](https://scalar.com/) via `@elysiajs/swagger` |
| Testing | [Vitest](https://vitest.dev/) |

---

## Prerequisites

- **Node.js** v22 or later (Volta pin: `22.15.0`)
- **pnpm** v9.9.0 or later
- **Docker** (recommended, for local PostgreSQL)

---

## Getting Started

All commands below are run from the **monorepo root** unless noted otherwise. The workspace is managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/repo).

### 1. Install dependencies

```bash
# From the monorepo root
pnpm install
```

### 2. Configure environment variables

```bash
cd apps-api/backoffice
cp .env.example .env
```

Edit `.env` with your local values (see [Environment Variables](#environment-variables) below).

### 3. Start PostgreSQL

```bash
# From the monorepo root
docker compose up -d
```

### 4. Run database migrations and generate the Prisma client

```bash
# Generate the Prisma client (runs prisma generate in @pple-today/database)
pnpm --filter @pple-today/database codegen

# Apply migrations
pnpm --filter @pple-today/database migrate
```

### 5. Start the development server

```bash
# From the monorepo root (runs all dev servers via Turbo)
pnpm dev

# Or run only this service
pnpm --filter @api/backoffice dev
```

The server listens on the port defined by `PORT` (default `2000`).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Variables marked **required** will cause startup to fail if absent.

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | | `production` | Runtime environment. Use `development` for pretty logs and extra tooling. |
| `PORT` | | `2000` | Port the HTTP server listens on. |
| `API_BASE_URL` | ✅ | — | Public base URL of this service (e.g. `http://localhost:2000`). |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string, e.g. `postgresql://pple:pple@localhost:9000/pple?schema=public`. |

### Authentication (OIDC / JWT)

| Variable | Required | Description |
|----------|----------|-------------|
| `OIDC_URL` | ✅ | Base URL of the OIDC provider. |
| `OIDC_CLIENT_ID` | ✅ | Client ID registered with the OIDC provider. |
| `OIDC_KEY_ID` | ✅ | Key ID (`kid`) used when signing private-key JWTs. |
| `OIDC_PRIVATE_JWT_KEY` | ✅ | RSA private key (PEM) for signing client-assertion JWTs. |
| `DEVELOPMENT_OIDC_URL` | | OIDC URL used only in the Swagger UI OAuth2 flow (dev only). |
| `DEVELOPMENT_OIDC_CLIENT_ID` | | Client ID for the Swagger UI OAuth2 flow (dev only). |

### Facebook

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FACEBOOK_API_URL` | | `https://graph.facebook.com/v23.0` | Facebook Graph API base URL. |
| `FACEBOOK_APP_ID` | ✅ | — | Facebook application ID. |
| `FACEBOOK_APP_SECRET` | ✅ | — | Facebook application secret. |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | ✅ | — | Token used to verify Facebook webhook subscriptions. |

### Google Cloud Storage

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT_ID` | | Google Cloud project ID. |
| `GCP_CLIENT_EMAIL` | | Service-account email for GCS access. |
| `GCP_PRIVATE_KEY` | | PEM private key of the service account (newlines as `\n`). |
| `GCP_STORAGE_BUCKET_NAME` | ✅ | GCS bucket name for file uploads. |

### Firebase Cloud Messaging

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Firebase service-account email. |
| `FIREBASE_PRIVATE_KEY` | ✅ | PEM private key of the Firebase service account. |

### Ballot Crypto Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BALLOT_CRYPTO_DOMAIN` | | `localhost:2001` | Host (and port) of the `@api/ballot-crypto` service. |
| `BALLOT_CRYPTO_TO_BACKOFFICE_KEY` | | `test` | Shared key that ballot-crypto uses to authenticate requests to this service. |
| `BACKOFFICE_TO_BALLOT_CRYPTO_KEY` | | `test` | Shared key this service uses to authenticate requests to ballot-crypto. |

### External Services

| Variable | Required | Description |
|----------|----------|-------------|
| `IMAGE_SERVER_BASE_URL` | ✅ | Base URL of the image hosting service. |
| `PPLE_ACTIVITY_BASE_URL` | ✅ | Base URL of the PPLE Activity API. |
| `PPLE_ACTIVITY_CACHE_TIME` | | Cache TTL in seconds for PPLE Activity responses. |

### API Documentation

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_SWAGGER` | `false` | Set to `true` to expose Swagger UI at `/swagger`. Keep disabled in production. |

---

## Development Commands

Run these from the `apps-api/backoffice` directory or via `--filter` from the monorepo root.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server with hot-reload (watches workspace sources). |
| `pnpm build` | Compile to `./build` (uses `esbuild` via `build.ts`). |
| `pnpm test` | Run Vitest tests once. |
| `pnpm test:cov` | Run tests with V8 coverage. |
| `pnpm coverage` | Open the HTML coverage report in a browser. |
| `pnpm typecheck` | Run `tsc --noEmit` type-checking. |
| `pnpm lint` | Run ESLint. |
| `pnpm format:check` | Check Prettier formatting. |

### Run a single package from the monorepo root

```bash
pnpm --filter @api/backoffice dev
pnpm --filter @api/backoffice test
pnpm --filter @api/backoffice build
```

---

## API Overview

### Base URL

```
http://localhost:2000        # local development
```

### Versioning

There is no URL version prefix. API version is tracked in `package.json` and exposed via the `/versions` endpoint.

### Authentication

All **admin** endpoints (`/admin/*`) require a bearer token:

```http
Authorization: Bearer <access_token>
```

Tokens are issued by the configured OIDC provider. The required role claim is `today-cms:admin`.

Public endpoints (e.g. `/polls`, `/feed`, `/elections`) either require a user token or are unauthenticated depending on the specific route.

### Request / Response Conventions

- Content type: `application/json` for both requests and responses.
- Dates are ISO 8601 strings.
- Pagination uses cursor-based or offset parameters depending on the endpoint.

### Error Handling

Errors follow a consistent JSON structure:

```json
{
  "message": "Descriptive error message",
  "code": 400
}
```

Common HTTP status codes used:

| Status | Meaning |
|--------|---------|
| `400` | Validation error / bad request |
| `401` | Missing or invalid bearer token |
| `403` | Insufficient permissions (missing `today-cms:admin` role) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Key Endpoints

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/versions` | API version info |
| `GET` | `/swagger` | Swagger UI (only when `ENABLE_SWAGGER=true`) |

### Application (public / user-authenticated)

| Prefix | Description |
|--------|-------------|
| `/auth` | Authentication (login, refresh, logout) |
| `/feed` | User feed |
| `/polls` | Polls (list, vote) |
| `/elections` | Election information |
| `/announcements` | Announcements |
| `/profile` | User profiles |
| `/notifications` | Push notification preferences |
| `/topics` | Topics / categories |
| `/hashtags` | Hashtag browsing |
| `/banners` | Promotional banners |
| `/search` | Full-text search |
| `/events` | Events |
| `/mini-app` | Mini-app data |
| `/files` | File retrieval |
| `/addresses` | Address / location data |
| `/facebook` | Facebook webhook receiver |

### Admin (requires `today-cms:admin` role)

| Prefix | Description |
|--------|-------------|
| `/admin/auth` | Current admin user info |
| `/admin/dashboard` | Summary statistics |
| `/admin/users` | User management |
| `/admin/posts` | Post moderation |
| `/admin/polls` | Poll management (create, archive) |
| `/admin/elections` | Election management (create, update) |
| `/admin/announcements` | Announcement management |
| `/admin/notifications` | Send bulk push notifications |
| `/admin/hashtags` | Hashtag management |
| `/admin/topics` | Topic management |
| `/admin/banners` | Banner management |
| `/admin/facebook` | Facebook page integration |
| `/admin/mini-app` | Mini-app configuration |
| `/admin/feeds` | Feed moderation |
| `/admin/file` | File upload (`/admin/file/upload`) |
| `/admin/address` | Address reference data |

---

## API Documentation (Swagger)

The API uses [`@elysiajs/swagger`](https://elysiajs.com/plugins/swagger) with the [Scalar](https://scalar.com/) UI.

To enable Swagger locally:

1. Set `ENABLE_SWAGGER=true` in your `.env`.
2. Set `DEVELOPMENT_OIDC_URL` and `DEVELOPMENT_OIDC_CLIENT_ID` to use the OAuth2 login flow in the UI.
3. Start the server (`pnpm dev`).
4. Open `http://localhost:2000/swagger`.

The Swagger UI groups endpoints into three sections: **Admin**, **Application**, and **System**.

Security schemes available in the UI:
- **accessToken** — paste a bearer JWT directly.
- **_developmentLogin** — OAuth2 PKCE flow (SHA-256) for interactive login during development.

---

## Code Structure

```
apps-api/backoffice/
├── src/
│   ├── index.ts              # Entrypoint — creates Elysia app, registers plugins & controllers
│   ├── app.types.ts          # Exported application types
│   ├── admin.types.ts        # Exported admin types
│   ├── constants/
│   │   └── roles.ts          # Role constant definitions
│   ├── plugins/
│   │   ├── config.ts         # Environment config + validation schema
│   │   ├── prisma.ts         # Prisma client (PostgreSQL adapter)
│   │   ├── auth-guard.ts     # User JWT guard
│   │   ├── admin-auth-guard.ts # Admin role guard
│   │   ├── file.ts           # Google Cloud Storage service
│   │   ├── cloud-messaging.ts # Firebase Cloud Messaging service
│   │   ├── ballot-crypto.ts  # Ballot crypto service client
│   │   └── log.ts            # Pino logger setup
│   ├── modules/
│   │   ├── index.ts          # Composes ApplicationController
│   │   ├── admin/
│   │   │   └── index.ts      # Composes AdminController
│   │   ├── version/          # /versions endpoint
│   │   ├── auth/             # Authentication module
│   │   ├── polls/            # Polls module
│   │   ├── elections/        # Elections module
│   │   └── ...               # Other feature modules
│   └── utils/
│       ├── jwt.ts            # JWT introspection helpers
│       ├── request.ts        # HTTP request helpers
│       ├── promise.ts        # Retry / exponential backoff
│       └── hashtag.ts        # Hashtag utilities
├── prisma/                   # Prisma schema (managed by @pple-today/database)
├── build.ts                  # esbuild production build script
├── Dockerfile                # Production container image
├── .env.example              # Environment variable template
└── package.json
```

Each feature module follows a **controller → service → repository** pattern and is registered with the Elysia app in `src/modules/index.ts` or `src/modules/admin/index.ts`.

---

## Building for Production

```bash
pnpm --filter @api/backoffice build
```

The compiled output is written to `apps-api/backoffice/build/`. The `Dockerfile` in the package root can be used to build a container image.

---

## Troubleshooting

### `DATABASE_URL` / PostgreSQL connection error

- Make sure PostgreSQL is running: `docker compose up -d` (from monorepo root).
- Verify the connection string in `.env` matches the Docker Compose service (default: `postgresql://pple:pple@localhost:9000/pple?schema=public`).
- If you recently changed the schema, regenerate the Prisma client: `pnpm --filter @pple-today/database codegen`.

### Pending migrations

Run `pnpm --filter @pple-today/database migrate` to apply any outstanding migrations.

### Auth / 401 errors

- Ensure `OIDC_URL`, `OIDC_CLIENT_ID`, `OIDC_KEY_ID`, and `OIDC_PRIVATE_JWT_KEY` are set correctly.
- Tokens must be issued by the configured OIDC provider and include the correct audience.
- Admin endpoints additionally require the `today-cms:admin` role claim.

### CORS issues

CORS is enabled globally via `@elysiajs/cors` with default settings. To restrict allowed origins, configure the plugin in `src/index.ts`.

### Swagger UI not loading

- Confirm `ENABLE_SWAGGER=true` is set in your `.env`.
- The Swagger route is registered only when this flag is `true`; it is absent in production builds.

### Facebook webhook verification fails

- Confirm `FACEBOOK_WEBHOOK_VERIFY_TOKEN` matches the token configured in your Facebook App's webhook settings.

### Push notifications not delivered

- Verify `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set.
- The `FIREBASE_PRIVATE_KEY` value must have literal `\n` characters replaced with actual newlines (or vice versa depending on your shell).

### `tsx` watch not picking up changes in workspace packages

The `dev` script explicitly watches `@pple-today/api-common` and `@pple-today/database` sources. If you add a new workspace dependency, append its path to the `--include` flags in the `dev` script in `package.json`.
