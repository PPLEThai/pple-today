import { build } from 'esbuild'
import { copy } from 'esbuild-plugin-copy'

import { version } from './package.json'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    sourcemap: true,
    target: 'node18',
    outfile: './build/index.js',
    platform: 'node',
    treeShaking: true,
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
      copy({
        assets: [
          {
            from: './node_modules/@pple-today/database/__generated__',
            to: './',
          },
        ],
      }),
    ],
  })
}
main()
