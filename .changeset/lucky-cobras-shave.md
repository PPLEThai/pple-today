---
'@api/ballot-crypto': patch
'@api/backoffice': patch
---

Drop node from the API Docker images entirely.

The images previously ran on `node:22-alpine` with bun installed on top, because
turbo and tsx both needed a node runtime. Bun runs TypeScript directly, so the
build scripts call `bun ./build.ts` instead of `tsx build.ts`, and turbo's
launcher works under bun as-is. Every stage now starts from
`oven/bun:1.4.1-alpine` and `tsx` is no longer a dependency of either service.

The runner stays on a clean bun image rather than the shared build base, so
turbo and jq stay out of the shipped layer.
