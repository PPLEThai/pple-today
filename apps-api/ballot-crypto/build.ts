import { build } from 'esbuild'

import { version } from './package.json'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    target: 'node22',
    outfile: './build/index.js',
    platform: 'node',
    // Elysia ships a dedicated 'bun' export condition; without it esbuild would
    // bundle the generic WebStandard build instead of the native Bun.serve one.
    conditions: ['bun'],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
  })
}
main()
