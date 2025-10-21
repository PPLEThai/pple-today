import { build } from 'esbuild'

import { version } from './package.json'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    minify: true,
    bundle: true,
    treeShaking: true,
    target: 'node22',
    outfile: './build/index.js',
    platform: 'node',
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
  })
}
main()
