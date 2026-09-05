---
'@pple-today/api-common': patch
'@api/ballot-crypto': patch
'@api/backoffice': patch
---

Serve the APIs from Elysia's native Bun adapter instead of `@elysiajs/node`.

Both services constructed Elysia with `adapter: node()`, which routed every
request through `@hono/node-server` even once the images ran on bun. Dropping
the adapter lets Elysia use `Bun.serve` directly; esbuild now resolves elysia's
`bun` export condition so the native build is what gets bundled.

The node adapter populated `path` on the logger context and the Bun adapter does
not, which broke every `autoLogging.ignore` rule. `@pple-today/api-common` now
exports `getLogContextPath`, which reads `path` when present and falls back to
parsing `request.url`, and the ignore rules go through it.

Requires the images to run on bun.
