// CI: write the env files the mobile build reads (`.env`, `.env.local`) from this
// step's environment.
//
//   node ./scripts/write-ci-env.mjs
//
// The workflows pass *every* repository secret to the step that runs this, so it
// must not dump the whole environment. Only these variables are written:
//   - names listed in `.env.template` (commented-out ones included), and
//   - `EXPO_PUBLIC_*` (public by definition: they are inlined into the JS bundle).
// Everything else (SSH keys, VPN config, database URLs, service-account JSON, ...)
// stays out of the files, and so out of Expo, Metro and fastlane.
//
// Why this matters: Expo's .env parser reads a continuation line of an unquoted
// multi-line value as `NAME=value`, taking everything before the first `=` as a
// name, and then logs every loaded name ("env: export ..."). A service-account
// JSON copied in raw put most of its private key into a public Actions log that
// way. So multi-line values are written as one double-quoted line with `\n`
// escapes, and after writing, the files are parsed back with Expo's own parser:
// if any name comes back that is not one we wrote, the step fails before anything
// can print it.
//
// Expo refuses "personal" keys (FASTLANE_USER, JAVA_HOME, ...) in `.env`; those go
// to `.env.local`. Keys Expo refuses anywhere are dropped. `fastlane/setup.sh`
// hands both files to fastlane.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { isIgnoredEnvKey, isLocalEnvKey } = require('@expo/env/build/constants')
const { parse } = require('@expo/env/build/parse')

const templateKeys = new Set(
  [
    ...readFileSync(new URL('../.env.template', import.meta.url), 'utf8').matchAll(
      /^#?\s*([A-Z][A-Z0-9_]*)=/gm
    ),
  ].map((m) => m[1])
)
const isAllowed = (key) => templateKeys.has(key) || key.startsWith('EXPO_PUBLIC_')

const shared = []
const local = []
const written = new Set()
const skipped = []

for (const key of Object.keys(process.env).sort()) {
  if (!isAllowed(key)) continue
  if (isIgnoredEnvKey(key)) {
    skipped.push(`${key} (refused by Expo)`)
    continue
  }
  let value = process.env[key]
  if (/[\r\n]/.test(value)) {
    // Double quotes make dotenv parsers (Expo's and fastlane's) turn `\n` back into
    // newlines. They do not unescape `\"` or `\\`, so a value holding those cannot
    // round-trip: leave it out rather than write something that parses differently.
    if (/["\\]/.test(value)) {
      skipped.push(`${key} (multi-line value with quotes or backslashes)`)
      continue
    }
    value = `"${value.replace(/\r?\n/g, '\\n')}"`
  }
  ;(isLocalEnvKey(key) ? local : shared).push(`${key}=${value}`)
  written.add(key)
}

const files = { '.env': shared, '.env.local': local }
for (const [file, lines] of Object.entries(files)) {
  const contents = lines.join('\n') + '\n'
  // Fail closed: every name Expo will see must be one we wrote on purpose.
  const unexpected = Object.keys(parse(contents)).filter((key) => !written.has(key))
  if (unexpected.length > 0) {
    // Never print the names: they would be fragments of a value.
    console.error(
      `${file}: ${unexpected.length} unexpected name(s) after parsing. Refusing to write it.`
    )
    process.exit(1)
  }
  writeFileSync(file, contents, { mode: 0o600 })
}

console.log(
  `Wrote .env (${shared.length}) and .env.local (${local.length}): ${[...written].join(', ') || 'nothing'}.` +
    (skipped.length ? ` Skipped: ${skipped.join('; ')}.` : '')
)
