// `expo-module-scripts` (dev dep of packages/expo-scroll-forwarder) pulls prettier v2 in
// under the alias `jest-snapshot-prettier`. That alias still declares a `prettier` bin, and
// with bun's hoisted linker it can win the name collision in the root node_modules/.bin,
// so `prettier` on PATH silently becomes 2.8.8 instead of the version we declare.
// pnpm's hoisted linker resolved this in favour of the real package; bun does not.
// Repoint the symlink at the prettier we actually depend on.
import { chmodSync, existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative } from 'node:path'

const require = createRequire(import.meta.url)
const binLink = new URL('../node_modules/.bin/prettier', import.meta.url).pathname

if (existsSync(dirname(binLink))) {
  const realBin = require.resolve('prettier/bin/prettier.cjs')
  chmodSync(realBin, 0o755)
  const current = lstatSync(binLink, { throwIfNoEntry: false })?.isSymbolicLink()
    ? readlinkSync(binLink)
    : null

  if (current === null || !current.includes('/prettier/bin/prettier.cjs')) {
    rmSync(binLink, { force: true })
    symlinkSync(relative(dirname(binLink), realBin), binLink)
    console.log('[postinstall] repointed node_modules/.bin/prettier ->', realBin)
  }
}
