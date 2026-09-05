---
'@pplethai/pple-today-miniapp-sdk': patch
'@pple-today/project-config': patch
'@pple-today/database': patch
'@pple-today/web-ui': patch
'@pple-today/ui': patch
'@api/ballot-crypto': patch
'@client/backoffice': patch
'@api/backoffice': patch
'@client/mobile': patch
---

Migrate the monorepo from pnpm to bun.

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
