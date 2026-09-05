# @pplethai/pple-today-miniapp-sdk

## 0.1.6

### Patch Changes

- [#473](https://github.com/PPLEThai/pple-today/pull/473) [`7ad7b64`](https://github.com/PPLEThai/pple-today/commit/7ad7b645c956419323206d48c3f87e13f83d2cb3) Thanks [@PanJ](https://github.com/PanJ)! - Migrate the monorepo from pnpm to bun.

  Dependency declarations were the main source of churn: bun only links what a
  package declares, so several imports that pnpm's hoisting had been supplying
  implicitly are now declared where they are used. Resolved versions were pinned
  to what `pnpm-lock.yaml` held, so 194 of 200 direct dependencies are unchanged.

  Two behavioural fixes ride along. `@api/backoffice` was copying Prisma's
  query-compiler WASM from a hardcoded `node_modules` path that no longer exists
  under bun's workspace linking, which silently dropped it from the build output
  and the published image; it is now resolved through Node module resolution.
  `@api/backoffice` also drops a vestigial `prisma` dependency whose version
  conflicted with `@pple-today/database` and caused Prisma to rewrite that
  package's manifest during codegen.

## 0.1.5

### Patch Changes

- [#455](https://github.com/PPLEThai/pple-today/pull/455) [`a3945e4`](https://github.com/PPLEThai/pple-today/commit/a3945e487bb5a57999981f14fc545894411be162) Thanks [@PanJ](https://github.com/PanJ)! - Keep the session when a notification deep-links into a mini app

  - The token exchange wrote the deep-link path over `clientUrl`'s pathname instead of joining under it, so an app registered on a sub-path lost that prefix: a notification addressing `kaitom-mp` at `attendances` opened `/attendances` rather than `/mp/attendances`, outside the app's own module. The browser door had always joined correctly, so the same link worked in a browser and failed in the app; both now share one `miniAppUrlWithPath`. Root-hosted apps are unaffected.
  - The mobile client resolved the same path the same way when opening a mini app that needs no authentication, so public apps on a sub-path lost their prefix too. Both callers now share one join.
  - The SDK read `window.location` twice: once in the constructor, once when the async `init()` finally ran. A client-side router that rewrote the URL in between — a catch-all redirect firing from a child effect, say — left the second read with no `access_token`, so the SDK concluded it was not running inside PPLE Today and redirected to the login page, discarding a session the app had already been handed. The launch URL is now captured once at construction; routing cannot revoke it.

## 0.1.4

### Patch Changes

- [#381](https://github.com/PPLEThai/pple-today/pull/381) [`4f91c17`](https://github.com/PPLEThai/pple-today/commit/4f91c17223bf46048426b3cbe556eeb78c19e6f2) Thanks [@miello](https://github.com/miello)! - fix: missing models file in output package

## 0.1.3

### Patch Changes

- [#358](https://github.com/PPLEThai/pple-today/pull/358) [`22658ca`](https://github.com/PPLEThai/pple-today/commit/22658ca6a2b96121ae0f6d86cf132cad932b9d8d) Thanks [@miello](https://github.com/miello)! - [[PPLE-648] [Mini App] Optimize package size by removing bundle flag](https://linear.app/snts/issue/PPLE-648/mini-app-optimize-package-size-by-removing-bundle-flag)

## 0.1.2

### Patch Changes

- [#341](https://github.com/PPLEThai/pple-today/pull/341) [`f8a86d5`](https://github.com/PPLEThai/pple-today/commit/f8a86d5ee678b0276fee0da33d878da89f1ed13e) Thanks [@miello](https://github.com/miello)! - [[PPLE-629] Add getProfile in mini-app sdk](https://linear.app/snts/issue/PPLE-629/add-getprofile-in-mini-app-sdk)

## 0.1.1

### Patch Changes

- [#319](https://github.com/PPLEThai/pple-today/pull/319) [`936568f`](https://github.com/PPLEThai/pple-today/commit/936568ff970e33367e7c4a4a07740997f07dbc4a) Thanks [@miello](https://github.com/miello)! - Update mini-app package info
