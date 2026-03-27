# PPLE Today

**PPLE Today** is an engagement platform that helps the party share timely updates, run interactive campaigns, and collect actionable supporter feedback through mobile and web experiences. The platform is composed of a back-end REST API, a web-based admin dashboard, cross-platform iOS/Android mobile apps, and a public Mini App SDK that lets third-party developers embed their own experiences inside the PPLE Today ecosystem.

The project is structured as a **pnpm + Turborepo monorepo** and is written entirely in TypeScript.

---

## 📦 Apps and Packages

### Apps — API (`apps-api/`)

| App                      | Package name         | Description                                                                                                                                           | Deeper README                              |
| ------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps-api/backoffice`    | `@api/backoffice`    | Central REST API — handles auth (OIDC/Facebook), content management, elections, voting, push notifications, and media storage. Runs on port **2000**. | [README](apps-api/backoffice/README.md)    |
| `apps-api/ballot-crypto` | `@api/ballot-crypto` | Cryptographic ballot service that uses Google Cloud KMS to sign and verify votes. Runs on port **2001**.                                              | [README](apps-api/ballot-crypto/README.md) |

### Apps — Client (`apps-client/`)

| App                      | Package name         | Description                                                                                                                                 | Deeper README                              |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps-client/backoffice` | `@client/backoffice` | React 19 + Vite admin dashboard for platform administrators (managing users, elections, polls, and content).                                | [README](apps-client/backoffice/README.md) |
| `apps-client/mobile`     | `@client/mobile`     | Expo / React Native mobile app for iOS and Android. Supports push notifications, social login (OIDC, Facebook), and the Mini App framework. | [README](apps-client/mobile/README.md)     |

### Packages (`packages/`)

| Package                          | Package name                        | Description                                                                                             | Deeper README                                      |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `packages/database`              | `@pple-today/database`              | Prisma schema, migrations, and seed scripts. Single source of truth for the PostgreSQL database.        | —                                                  |
| `packages/api-common`            | `@pple-today/api-common`            | Shared Elysia plugins, DTOs, services, and utilities reused by all API apps.                            | —                                                  |
| `packages/api-client`            | `@pple-today/api-client`            | Type-safe HTTP client (Elysia Eden) used by web and mobile front-ends to call the backoffice API.       | —                                                  |
| `packages/ui`                    | `@pple-today/ui`                    | React Native UI component library (NativeWind / Tailwind) used by the mobile app.                       | —                                                  |
| `packages/web-ui`                | `@pple-today/web-ui`                | React web UI component library (Tailwind + Radix UI) used by the backoffice dashboard.                  | —                                                  |
| `packages/mini-app`              | `@pplethai/pple-today-miniapp-sdk`  | Public Mini App SDK (published to npm) for third-party developers building mini apps inside PPLE Today. | —                                                  |
| `packages/expo-scroll-forwarder` | `@pple-today/expo-scroll-forwarder` | Custom Expo module for forwarding scroll events between nested scroll views.                            | [README](packages/expo-scroll-forwarder/README.md) |
| `packages/tailwind-config`       | `@pple-today/tailwind-config`       | Shared Tailwind CSS configuration used by all front-end packages.                                       | —                                                  |
| `packages/project-config`        | `@pple-today/project-config`        | Centralised ESLint, Prettier, and TypeScript configurations for the entire monorepo.                    | —                                                  |

### Examples (`examples/`)

| Example             | Description                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `examples/mini-app` | Reference implementation of a Mini App (Elysia backend + React Router 7 frontend) that integrates with the Mini App SDK. |

---

## 📚 Important Libraries

### Backend / API

| Library                                                                         | Role                                                                                                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Elysia](https://elysiajs.com/)                                                 | TypeScript HTTP framework used for all API services. Provides end-to-end type safety via Eden.                               |
| [Prisma](https://www.prisma.io/)                                                | ORM for PostgreSQL — schema, migrations, and typed queries.                                                                  |
| [neverthrow](https://github.com/supermacro/neverthrow)                          | Result-type error handling instead of throwing exceptions (`ok` / `err`). Used extensively in service and repository layers. |
| [@sinclair/typebox](https://github.com/sinclairzx81/typebox)                    | JSON Schema builder used for request/response validation with Elysia.                                                        |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)                      | JWT creation and verification for service-to-service auth.                                                                   |
| [@google-cloud/storage](https://github.com/googleapis/nodejs-storage)           | Google Cloud Storage for media uploads.                                                                                      |
| [@google-cloud/kms](https://github.com/googleapis/nodejs-kms)                   | Google Cloud KMS used by `ballot-crypto` for cryptographic signing.                                                          |
| [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) | Google OAuth2 / service account authentication.                                                                              |

### Frontend — Web (Backoffice Dashboard)

| Library                                                    | Role                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [React 19](https://react.dev/)                             | UI framework for the backoffice dashboard.                                      |
| [React Router v7](https://reactrouter.com/)                | File-system-based routing with type-safe route tree generation (`tsr codegen`). |
| [TanStack React Query](https://tanstack.com/query)         | Server-state management, caching, and data fetching.                            |
| [React Hook Form](https://react-hook-form.com/)            | Performant form state management.                                               |
| [Zod](https://zod.dev/)                                    | Schema validation for forms and API responses.                                  |
| [TanStack React Table](https://tanstack.com/table)         | Headless data table with sorting, filtering, and pagination.                    |
| [Radix UI](https://www.radix-ui.com/)                      | Accessible, unstyled UI primitives (used inside `@pple-today/web-ui`).          |
| [Tailwind CSS](https://tailwindcss.com/)                   | Utility-first CSS framework.                                                    |
| [oidc-client-ts](https://github.com/authts/oidc-client-ts) | OpenID Connect login / token refresh flow.                                      |
| [Vite](https://vite.dev/)                                  | Fast development server and production bundler.                                 |

### Frontend — Mobile

| Library                                                                           | Role                                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/)              | Cross-platform iOS/Android framework.              |
| [Expo Router](https://expo.github.io/router/)                                     | File-based routing for React Native apps.          |
| [TanStack React Query](https://tanstack.com/query)                                | Server-state management (shared pattern with web). |
| [NativeWind](https://www.nativewind.dev/)                                         | Tailwind CSS for React Native styling.             |
| [React Native Firebase](https://rnfirebase.io/)                                   | Push notifications via Firebase Cloud Messaging.   |
| [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)    | High-performance animations.                       |
| [Lottie React Native](https://github.com/lottie-react-native/lottie-react-native) | JSON-based animation playback.                     |
| [TanStack React Form](https://tanstack.com/form)                                  | Form state management on mobile.                   |
| [react-native-fbsdk-next](https://github.com/thebergamo/react-native-fbsdk-next)  | Facebook login integration.                        |

### Shared / Monorepo

| Library                                                          | Role                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Turborepo](https://turborepo.com/)                              | Monorepo build system with task-graph caching.                           |
| [pnpm](https://pnpm.io/)                                         | Fast, disk-efficient package manager with workspace support.             |
| [TypeScript 5.8](https://www.typescriptlang.org/)                | Static typing across the entire codebase.                                |
| [Vitest](https://vitest.dev/)                                    | Unit test runner used by API packages.                                   |
| [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) | Linting and formatting (config shared via `@pple-today/project-config`). |
| [Changesets](https://github.com/changesets/changesets)           | Versioning and changelog management for publishable packages.            |
| [remeda](https://remedajs.com/)                                  | Functional utility library (type-safe Lodash alternative).               |
| [dayjs](https://day.js.org/)                                     | Lightweight date/time manipulation.                                      |

---

## 💡 Tips and Tricks

- **Monorepo commands first.** Run `pnpm install` from the **root** of the repository. Never run `npm install` or `yarn` — the project requires pnpm 9.9.0 and Node.js ≥ 22.

- **Turbo task graph.** `turbo.json` defines the dependency order. `build` depends on `codegen`, so running `pnpm build` from the root will generate all code first. When developing a single package, filter: `pnpm turbo dev --filter=@api/backoffice`.

- **Code generation is mandatory before TypeScript.** The route trees (`routeTree.gen.ts`), Prisma client (`__generated__/prisma`), and Elysia Eden types are all generated artefacts. Run `pnpm codegen` after a fresh clone or after changing the Prisma schema / route files. CI fails if generated files are stale.

- **Type-safe API client.** The backoffice API exposes its full TypeScript type signature via `@elysiajs/eden`. Any change to a route handler signature is automatically reflected in `@pple-today/api-client` without manual schema updates — just run `pnpm codegen`.

- **neverthrow pattern.** Service and repository functions return `Result<T, E>` instead of throwing. Use `.match()`, `.map()`, or `isOk()` to handle the result. Do not introduce `throw` unless you are handling a truly unrecoverable error.

- **Environment variables.** Every app has a `.env.example` (or `.env.template` for mobile). Copy the example file to `.env` before running the app. The API uses `dotenv`; the mobile app uses Expo's `--env-file` flag. Never commit `.env` files.

- **Database is always the `@pple-today/database` package.** Prisma schema and migrations live in `packages/database/prisma/`. If you add a new model or column, run `pnpm --filter=@pple-today/database migrate` to create a migration, then `pnpm --filter=@pple-today/database codegen` to regenerate the Prisma client.

- **Shared UI components.** Mobile UI lives in `@pple-today/ui`; web UI lives in `@pple-today/web-ui`. Add new reusable components to the appropriate package rather than co-locating them in an app.

- **`examples/mini-app`** is a self-contained reference for anyone building a Mini App. Read through it before touching `packages/mini-app`.

- **CI runs on macOS** because the mobile prebuild step (generating native iOS/Android code) requires macOS tooling. If you add a workflow step that only runs on Linux, make sure it is conditioned correctly.

- **Versioning.** The project uses [Changesets](https://github.com/changesets/changesets). When you make a user-facing change to a publishable package (e.g. `packages/mini-app`), add a changeset with `pnpm changeset` before raising your PR.

---

## ⚙️ Local Setup and Run

### Prerequisites

| Tool                          | Required version                                                             |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Node.js                       | ≥ 22 (LTS recommended — use [Volta](https://volta.sh/) to pin automatically) |
| pnpm                          | 9.9.0 — install with `npm install -g pnpm@9.9.0`                             |
| Docker                        | Any recent version (for running PostgreSQL locally)                          |
| Xcode (iOS only)              | Latest stable                                                                |
| Android Studio (Android only) | Latest stable                                                                |

### 1. Clone the repository

```bash
git clone https://github.com/PPLEThai/pple-today.git
cd pple-today
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start the local database

```bash
docker compose up -d
```

This starts a PostgreSQL 15 container on **port 9000** with:

- user: `pple`
- password: `pple`
- database: `pple`

### 4. Configure environment variables

Copy the example env files for the services you want to run:

```bash
# Backend API
cp apps-api/backoffice/.env.example apps-api/backoffice/.env

# Ballot crypto service (optional for most local work)
cp apps-api/ballot-crypto/.env.example apps-api/ballot-crypto/.env

# Web admin dashboard
cp apps-client/backoffice/.env.example apps-client/backoffice/.env

# Mobile app
cp apps-client/mobile/.env.template apps-client/mobile/.env
```

At minimum, set the `DATABASE_URL` in `apps-api/backoffice/.env`:

```env
DATABASE_URL=postgresql://pple:pple@localhost:9000/pple?schema=public
```

### 5. Run database migrations and generate the Prisma client

```bash
pnpm --filter=@pple-today/database migrate   # apply all pending migrations
pnpm --filter=@pple-today/database codegen   # generate the Prisma client
```

To seed the database with development data:

```bash
pnpm --filter=@pple-today/database seed:dev
```

### 6. Generate code (route trees, API types)

```bash
pnpm codegen
```

### 7. Start the development servers

To start **everything** at once (API + web dashboard + mobile):

```bash
pnpm dev
```

Or start individual apps:

```bash
# Backend API only (http://localhost:2000, Swagger at /swagger)
pnpm turbo dev --filter=@api/backoffice

# Web admin dashboard only (http://localhost:5173)
pnpm turbo dev --filter=@client/backoffice

# Mobile app (Expo dev client)
pnpm turbo dev --filter=@client/mobile
```

### 8. Mobile-specific setup

> **macOS is required for iOS development.**

**iOS:**

```bash
cd apps-client/mobile
pnpm prebuild:ios        # generates the native ios/ directory
pnpm open:ios            # opens the project in Xcode
# — or —
pnpm ios                 # builds and runs on the default simulator
```

**Android:**

```bash
cd apps-client/mobile
pnpm prebuild:android    # generates the native android/ directory
pnpm android             # builds and runs on the default emulator
```

---

## 🙌 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository on GitHub and clone your fork locally.

2. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes**, following the conventions already in the codebase:

   - TypeScript everywhere — no `any` without a comment explaining why.
   - Use `neverthrow` `Result` types in service/repository functions.
   - Put reusable UI in `packages/ui` (mobile) or `packages/web-ui` (web).
   - Keep Prisma schema changes in `packages/database` and include a migration.
   - Run `pnpm codegen` after schema or route changes.

4. **Add a changeset** if you changed a publishable package:

   ```bash
   pnpm changeset
   ```

5. **Verify your changes pass all checks:**

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm format:check
   ```

6. **Push** your branch and open a **Pull Request** against `main`.  
   Fill in the PR template describing _what_ changed and _why_.

7. A maintainer will review your PR. Address any review comments, and once approved it will be merged.

For questions or discussions, open a [GitHub Issue](https://github.com/PPLEThai/pple-today/issues).
