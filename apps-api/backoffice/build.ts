import { build } from 'esbuild'
import { copy } from 'esbuild-plugin-copy'

import { version } from './package.json'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    target: 'node18',
    outfile: './build/index.js',
    platform: 'node',
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
      copy({
        assets: [
          {
            from: './node_modules/@pple-today/database/__generated__/prisma/*.wasm',
            to: './__generated__/prisma',
          },
        ],
      }),
    ],
  })
}
main()
