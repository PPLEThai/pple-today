import { build } from 'esbuild'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    treeShaking: true,
    minify: true,
    platform: 'browser',
    outfile: './build/script.js',
    bundle: true,
    external: ['zod', 'oidc-client-ts'],
    target: ['es6'],
  })
  await build({
    entryPoints: ['./src/index.ts'],
    treeShaking: true,
    minify: true,
    platform: 'neutral',
    bundle: true,
    external: ['zod', 'oidc-client-ts'],
    outfile: './build/esm.js',
  })
  await build({
    entryPoints: ['./src/index.ts'],
    treeShaking: true,
    minify: true,
    outfile: './build/cjs.js',
    bundle: true,
    external: ['zod', 'oidc-client-ts'],
    platform: 'node',
    target: ['es6'],
  })
}
main()
