---
'@api/ballot-crypto': patch
'@api/backoffice': patch
---

Run the API images on bun instead of node.

Both services were still executed by node after the bun migration; only the
package manager had changed. Their Docker runner stages now start from
oven/bun:1.4.1-alpine and use `bun index.js`. The builder and installer stages
stay on node, since turbo and tsx run there.

No application code changes — the same esbuild bundle is executed by a different
runtime. Dropping node, npm and turbo from the final image takes it from 350MB
to 94.6MB.
