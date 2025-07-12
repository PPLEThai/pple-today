import { build } from 'esbuild'

import { version } from './package.json'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    sourcemap: true,
    target: 'node18',
    outfile: './build/index.js',
    platform: 'node',
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
  })
}
main()
