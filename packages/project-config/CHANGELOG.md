# @pple-today/project-config

## 1.0.1

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

## 1.0.0

### Major Changes

- [#284](https://github.com/PPLEThai/pple-today/pull/284) [`e014f92`](https://github.com/PPLEThai/pple-today/commit/e014f92bb07792b8b68d5bd3e3a3763f957ae01d) Thanks [@Anon-136](https://github.com/Anon-136)! - Major Bump

## 0.2.1

### Patch Changes

- [#223](https://github.com/PPLEThai/pple-today/pull/223) [`c8cc567`](https://github.com/PPLEThai/pple-today/commit/c8cc5674c7d9cf3caa8edc0ddf180278a4b9c218) Thanks [@Anon-136](https://github.com/Anon-136)! - [BREAKING [PPLE-330] Fix performance issue on RN new arch](https://linear.app/snts/issue/PPLE-330/fix-performance-issue-on-rn-new-arch)

## 0.2.0

### Minor Changes

- [#12](https://github.com/PPLEThai/pple-today/pull/12) [`29b2efa`](https://github.com/PPLEThai/pple-today/commit/29b2efa55ee2c899b6e039836f457f18d9a41690) Thanks [@miello](https://github.com/miello)! - [PPLE-119] Setup PPLE Today Frontend
