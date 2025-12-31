import { build } from 'esbuild'

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    treeShaking: true,
    minify: true,
    platform: 'browser',
    outfile: './build/script.js',
    target: ['es6'],
  })
  await build({
    entryPoints: ['./src/index.ts'],
    treeShaking: true,
    minify: true,
    platform: 'neutral',
    outfile: './build/esm.js',
  })
  await build({
    entryPoints: ['./src/index.ts'],
    treeShaking: true,
    minify: true,
    outfile: './build/cjs.js',
    platform: 'node',
    target: ['es6'],
  })
}
main()
