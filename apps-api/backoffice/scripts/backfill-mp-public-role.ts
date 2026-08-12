/**
 * One-time backfill: copy AD public-role labels from pple-sso `PplePerson`
 * onto Today `User.responsibleArea`, matched by phone.
 *
 * `/auth/me` only fills this when the user opens the app. This script covers
 * everyone, including approved rows tagged extra-role `testUser` (SSO
 * introspect ignores those, so they would never sync otherwise).
 *
 * A real (non-testUser) MP/assistant row on the same mobile still wins.
 *
 * DRY-RUN by default; pass --execute to write. Requires DATABASE_URL (Today)
 * and SSO_DATABASE_URL (pple-sso).
 *
 * Usage (from apps-api/backoffice):
 *   pnpm backfill:mp-public-role
 *   pnpm backfill:mp-public-role -- --execute
 */

import { PrismaClient } from '@pple-today/database/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const EXECUTE = process.argv.includes('--execute')
const SHOW_HELP = process.argv.includes('--help') || process.argv.includes('-h')

const MP_ROLE = 'mp'
const MP_ASSISTANT_ROLE = 'mp_assistant'
const TEST_USER_EXTRA_ROLE = 'testUser'
const PARTYLIST_AREA = 'บัญชีรายชื่อ'
const ROLE_PREFIX: Record<string, string> = {
  [MP_ROLE]: 'สส.',
  [MP_ASSISTANT_ROLE]: 'ผู้ช่วย สส.',
}

type AdMetadata = {
  extra_roles?: unknown
  mp_type?: unknown
  province?: unknown
  province_number?: unknown
}

type SsoPerson = {
  id: number
  mobile: string
  role: string
  metadata: unknown
}

type PlannedRow = {
  mobile: string
  ssoPersonId: number
  role: string
  testUserOnly: boolean
  publicRole: string
  userId: string | null
  userName: string | null
  todayPhone: string | null
  previous: string | null
  action: 'update' | 'already' | 'missing'
}

function printHelp() {
  console.log(`
Backfill MP / MP-assistant public_role from pple-sso onto Today User.responsibleArea.

Usage:
  pnpm backfill:mp-public-role
  pnpm backfill:mp-public-role -- --execute

Options:
  --execute   Write responsibleArea. Without this flag, print the plan only.
  --help,-h   Show this help.

Env: DATABASE_URL (Today), SSO_DATABASE_URL (pple-sso).
`)
}

function asAdMetadata(metadata: unknown): AdMetadata {
  if (!metadata || typeof metadata !== 'object') return {}
  const ad = (metadata as { ad?: unknown }).ad
  if (!ad || typeof ad !== 'object') return {}
  return ad as AdMetadata
}

function isTestUser(metadata: unknown): boolean {
  const extraRoles = asAdMetadata(metadata).extra_roles
  return Array.isArray(extraRoles) && extraRoles.includes(TEST_USER_EXTRA_ROLE)
}

function formatMpPublicRole(role: string, metadata: unknown): string {
  const prefix = ROLE_PREFIX[role] ?? role
  const ad = asAdMetadata(metadata)
  if (ad.mp_type === 'partylist') return `${prefix} ${PARTYLIST_AREA}`
  if (typeof ad.province === 'string' && ad.province.length > 0) {
    if (typeof ad.province_number === 'number') {
      return `${prefix} ${ad.province} เขต ${ad.province_number}`
    }
    return `${prefix} ${ad.province}`
  }
  return prefix
}

function pickPerson(rows: SsoPerson[]): SsoPerson {
  const real = rows.filter((row) => !isTestUser(row.metadata))
  const pool = real.length > 0 ? real : rows
  const person =
    pool.find((row) => row.role === MP_ROLE) ?? pool.find((row) => row.role === MP_ASSISTANT_ROLE)
  if (!person) {
    throw new Error(`No mp/mp_assistant row for mobile ${rows[0]?.mobile}`)
  }
  return person
}

function phoneKeys(mobile: string): string[] {
  const trimmed = mobile.trim()
  const digits = trimmed.replace(/\D/g, '')
  const local = digits.startsWith('66') && digits.length >= 11 ? `0${digits.slice(2)}` : digits
  const e164 = local.startsWith('0') ? `+66${local.slice(1)}` : trimmed.startsWith('+') ? trimmed : `+${digits}`
  return [...new Set([trimmed, local, e164].filter((value) => value.length > 0))]
}

function createPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

async function main() {
  if (SHOW_HELP) {
    printHelp()
    return
  }

  const todayUrl = process.env.DATABASE_URL
  const ssoUrl = process.env.SSO_DATABASE_URL
  if (!todayUrl || !ssoUrl) {
    console.error('Required env vars: DATABASE_URL, SSO_DATABASE_URL')
    process.exit(1)
  }

  const today = createPrisma(todayUrl)
  const sso = createPrisma(ssoUrl)

  try {
    const persons = await sso.$queryRaw<SsoPerson[]>`
      SELECT id, mobile, role, metadata
      FROM "PplePerson"
      WHERE status = 'approved'
        AND role IN ('mp', 'mp_assistant')
    `

    const byMobile = new Map<string, SsoPerson[]>()
    for (const person of persons) {
      const rows = byMobile.get(person.mobile) ?? []
      rows.push(person)
      byMobile.set(person.mobile, rows)
    }

    const labels = [...byMobile.entries()].map(([mobile, rows]) => {
      const person = pickPerson(rows)
      return {
        mobile,
        person,
        testUserOnly: rows.every((row) => isTestUser(row.metadata)),
        publicRole: formatMpPublicRole(person.role, person.metadata),
      }
    })

    const phoneToLabel = new Map<string, (typeof labels)[number]>()
    for (const label of labels) {
      for (const key of phoneKeys(label.mobile)) {
        phoneToLabel.set(key, label)
      }
    }

    const users = await today.user.findMany({
      where: { phoneNumber: { in: [...phoneToLabel.keys()] } },
      select: { id: true, name: true, phoneNumber: true, responsibleArea: true },
    })

    const matchedMobiles = new Set<string>()
    const plan: PlannedRow[] = []

    for (const user of users) {
      const label = phoneToLabel.get(user.phoneNumber)
      if (!label) continue
      matchedMobiles.add(label.mobile)
      plan.push({
        mobile: label.mobile,
        ssoPersonId: label.person.id,
        role: label.person.role,
        testUserOnly: label.testUserOnly,
        publicRole: label.publicRole,
        userId: user.id,
        userName: user.name,
        todayPhone: user.phoneNumber,
        previous: user.responsibleArea,
        action: user.responsibleArea === label.publicRole ? 'already' : 'update',
      })
    }

    for (const label of labels) {
      if (matchedMobiles.has(label.mobile)) continue
      plan.push({
        mobile: label.mobile,
        ssoPersonId: label.person.id,
        role: label.person.role,
        testUserOnly: label.testUserOnly,
        publicRole: label.publicRole,
        userId: null,
        userName: null,
        todayPhone: null,
        previous: null,
        action: 'missing',
      })
    }

    const updates = plan.filter((row) => row.action === 'update')
    const already = plan.filter((row) => row.action === 'already')
    const missing = plan.filter((row) => row.action === 'missing')
    const testUserOnly = plan.filter((row) => row.testUserOnly)

    console.log(`${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: ${labels.length} SSO MP/assistant mobile(s)\n`)
    console.log(`  update:         ${updates.length}`)
    console.log(`  already synced: ${already.length}`)
    console.log(`  no Today user:  ${missing.length}`)
    console.log(`  testUser-only:  ${testUserOnly.length}\n`)

    for (const row of plan) {
      const tag = row.testUserOnly ? ' testUser' : ''
      if (row.action === 'update') {
        console.log(
          `~ ${row.todayPhone} ${row.userName} [${row.role}]${tag}: ${JSON.stringify(row.previous)} → ${JSON.stringify(row.publicRole)}`
        )
      } else if (row.action === 'missing') {
        console.log(`? ${row.mobile} [${row.role}]${tag}: ${JSON.stringify(row.publicRole)} (no Today user)`)
      }
    }

    if (!EXECUTE) {
      console.log(`\nDry-run only. Re-run with --execute to apply ${updates.length} update(s).`)
      return
    }

    let updated = 0
    for (const row of updates) {
      if (!row.userId) continue
      await today.user.update({
        where: { id: row.userId },
        data: { responsibleArea: row.publicRole },
      })
      updated += 1
    }

    console.log(`\nDone. Updated ${updated}.`)
  } finally {
    await Promise.all([today.$disconnect(), sso.$disconnect()])
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
