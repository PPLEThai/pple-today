import { createRequire } from 'node:module'
import path from 'node:path'

import { build } from 'esbuild'
import { copy } from 'esbuild-plugin-copy'

import { version } from './package.json'

// Resolve the generated Prisma client through Node's module resolution rather than a
// hardcoded ./node_modules path: bun links workspace packages at the repo root only,
// so apps-api/backoffice/node_modules/@pple-today/database does not exist.
const require = createRequire(import.meta.url)
const prismaClientDir = path.dirname(require.resolve('@pple-today/database/prisma'))

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    target: 'node22',
    outfile: './build/index.js',
    platform: 'node',
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
      copy({
        assets: [
          {
            from: [path.join(prismaClientDir, '*.wasm')],
            to: './__generated__/prisma',
          },
        ],
      }),
    ],
  })
}
main()
