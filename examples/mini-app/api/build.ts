import { build } from 'esbuild'

import packageJson from './package.json'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    target: 'node22',
    outfile: './build/index.js',
    platform: 'node',
    define: {
      __APP_VERSION__: JSON.stringify((packageJson as any).version ?? '0.0.0'),
    },
  })
}
main()
