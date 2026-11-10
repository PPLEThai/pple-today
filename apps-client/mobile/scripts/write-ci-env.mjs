// CI: write the job's environment (`env` output on stdin) to the env files the
// build reads, in the split Expo SDK 58+ requires.
//
//   env | node ./scripts/write-ci-env.mjs
//
// Expo refuses to start if `.env` holds a "personal" key (ANDROID_HOME, JAVA_HOME,
// FASTLANE_USER, ...): those are only allowed in a `.local` env file. It refuses
// some keys anywhere (NODE_OPTIONS, DYLD_*, shell hooks, ...). So each variable
// goes to `.env`, to `.env.local`, or nowhere, decided by Expo's own rules.
// Dropped keys are still in the real environment of every later step.
//
// Lines are copied as they are, so a multi-line value stays exactly as `env`
// printed it: a line that does not start a `KEY=` belongs to the variable above.
// `fastlane/setup.sh` hands both files to fastlane.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { isIgnoredEnvKey, isLocalEnvKey } = require('@expo/env/build/constants')

const shared = []
const local = []
const dropped = []
let target = shared

for (const line of readFileSync(0, 'utf8').split('\n')) {
  const key = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line)?.[1]
  if (key) {
    if (isIgnoredEnvKey(key)) {
      target = null
      dropped.push(key)
    } else {
      target = isLocalEnvKey(key) ? local : shared
    }
  }
  target?.push(line)
}

writeFileSync('.env', shared.join('\n') + '\n')
writeFileSync('.env.local', local.join('\n') + '\n')
console.log(
  `Wrote .env and .env.local (${local.length} local-only lines). Dropped: ${dropped.join(', ') || 'none'}.`
)
