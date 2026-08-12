/**
 * One-time backfill: copy AD public-role labels from pple-sso `PplePerson`
 * onto Today `User.responsibleArea`, matched by phone.
 *
 * `/auth/me` only fills this when the user opens the app. Rows tagged
 * extra-role `testUser` are ignored (same as SSO introspect): they are not
 * treated as MP, `responsibleArea` is cleared if it was set, and stale
 * `pple-ad:mp` / `pple-ad:mpassistant` rows are removed from `UserRole`.
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
const TODAY_MP_ROLE = 'pple-ad:mp'
const TODAY_MP_ASSISTANT_ROLE = 'pple-ad:mpassistant'
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

type Label = {
  mobile: string
  person: SsoPerson | null
  hasRealMp: boolean
  hasRealAssistant: boolean
  publicRole: string | null
}

type PlannedRow = {
  mobile: string
  ssoPersonId: number | null
  role: string | null
  testUserOnly: boolean
  publicRole: string | null
  userId: string | null
  userName: string | null
  todayPhone: string | null
  previous: string | null
  rolesToRemove: string[]
  action: 'update' | 'already' | 'clear' | 'skip' | 'missing'
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

function pickPerson(rows: SsoPerson[]): SsoPerson | null {
  const real = rows.filter((row) => !isTestUser(row.metadata))
  if (real.length === 0) return null
  return (
    real.find((row) => row.role === MP_ROLE) ??
    real.find((row) => row.role === MP_ASSISTANT_ROLE) ??
    null
  )
}

function toLabel(mobile: string, rows: SsoPerson[]): Label {
  const real = rows.filter((row) => !isTestUser(row.metadata))
  const person = pickPerson(rows)
  return {
    mobile,
    person,
    hasRealMp: real.some((row) => row.role === MP_ROLE),
    hasRealAssistant: real.some((row) => row.role === MP_ASSISTANT_ROLE),
    publicRole: person ? formatMpPublicRole(person.role, person.metadata) : null,
  }
}

function staleTodayRoles(label: Label, userRoles: string[]): string[] {
  const stale: string[] = []
  if (!label.hasRealMp && userRoles.includes(TODAY_MP_ROLE)) stale.push(TODAY_MP_ROLE)
  if (!label.hasRealAssistant && userRoles.includes(TODAY_MP_ASSISTANT_ROLE)) {
    stale.push(TODAY_MP_ASSISTANT_ROLE)
  }
  return stale
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

    const labels = [...byMobile.entries()].map(([mobile, rows]) => toLabel(mobile, rows))

    const phoneToLabel = new Map<string, (typeof labels)[number]>()
    for (const label of labels) {
      for (const key of phoneKeys(label.mobile)) {
        phoneToLabel.set(key, label)
      }
    }

    const users = await today.user.findMany({
      where: { phoneNumber: { in: [...phoneToLabel.keys()] } },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        responsibleArea: true,
        roles: { select: { role: true } },
      },
    })

    const matchedMobiles = new Set<string>()
    const plan: PlannedRow[] = []

    for (const user of users) {
      const label = phoneToLabel.get(user.phoneNumber)
      if (!label) continue
      matchedMobiles.add(label.mobile)

      const testUserOnly = !label.hasRealMp && !label.hasRealAssistant
      const rolesToRemove = staleTodayRoles(
        label,
        user.roles.map((row) => row.role)
      )

      let action: PlannedRow['action']
      if (testUserOnly) {
        action = user.responsibleArea === null ? 'skip' : 'clear'
      } else {
        action = user.responsibleArea === label.publicRole ? 'already' : 'update'
      }

      plan.push({
        mobile: label.mobile,
        ssoPersonId: label.person?.id ?? null,
        role: label.person?.role ?? null,
        testUserOnly,
        publicRole: label.publicRole,
        userId: user.id,
        userName: user.name,
        todayPhone: user.phoneNumber,
        previous: user.responsibleArea,
        rolesToRemove,
        action,
      })
    }

    for (const label of labels) {
      if (matchedMobiles.has(label.mobile) || (!label.hasRealMp && !label.hasRealAssistant)) continue
      plan.push({
        mobile: label.mobile,
        ssoPersonId: label.person?.id ?? null,
        role: label.person?.role ?? null,
        testUserOnly: false,
        publicRole: label.publicRole,
        userId: null,
        userName: null,
        todayPhone: null,
        previous: null,
        rolesToRemove: [],
        action: 'missing',
      })
    }

    const updates = plan.filter((row) => row.action === 'update')
    const clears = plan.filter((row) => row.action === 'clear')
    const already = plan.filter((row) => row.action === 'already')
    const skipped = plan.filter((row) => row.action === 'skip')
    const missing = plan.filter((row) => row.action === 'missing')
    const roleStrips = plan.filter((row) => row.rolesToRemove.length > 0)

    console.log(`${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: ${labels.length} SSO MP/assistant mobile(s)\n`)
    console.log(`  update:         ${updates.length}`)
    console.log(`  clear testUser: ${clears.length}`)
    console.log(`  already synced: ${already.length}`)
    console.log(`  skip testUser:  ${skipped.length}`)
    console.log(`  strip UserRole: ${roleStrips.length}`)
    console.log(`  no Today user:  ${missing.length}\n`)

    for (const row of plan) {
      const roleNote =
        row.rolesToRemove.length > 0 ? `; remove UserRole ${row.rolesToRemove.join(', ')}` : ''
      if (row.action === 'update') {
        console.log(
          `~ ${row.todayPhone} ${row.userName} [${row.role}]: ${JSON.stringify(row.previous)} → ${JSON.stringify(row.publicRole)}${roleNote}`
        )
      } else if (row.action === 'clear') {
        console.log(
          `- ${row.todayPhone} ${row.userName} testUser: ${JSON.stringify(row.previous)} → null${roleNote}`
        )
      } else if (row.action === 'skip') {
        console.log(
          `· ${row.todayPhone} ${row.userName} testUser: leave responsibleArea null${roleNote}`
        )
      } else if (row.action === 'already' && roleNote) {
        console.log(`= ${row.todayPhone} ${row.userName} [${row.role}]: area already synced${roleNote}`)
      } else if (row.action === 'missing') {
        console.log(`? ${row.mobile} [${row.role}]: ${JSON.stringify(row.publicRole)} (no Today user)`)
      }
    }

    const writes = plan.filter(
      (row) =>
        row.userId &&
        (row.action === 'update' || row.action === 'clear' || row.rolesToRemove.length > 0)
    )

    if (!EXECUTE) {
      console.log(`\nDry-run only. Re-run with --execute to apply ${writes.length} write(s).`)
      return
    }

    let updated = 0
    let cleared = 0
    let stripped = 0
    for (const row of writes) {
      if (!row.userId) continue
      if (row.action === 'update') {
        await today.user.update({
          where: { id: row.userId },
          data: { responsibleArea: row.publicRole },
        })
        updated += 1
      } else if (row.action === 'clear') {
        await today.user.update({
          where: { id: row.userId },
          data: { responsibleArea: null },
        })
        cleared += 1
      }
      if (row.rolesToRemove.length > 0) {
        await today.userRole.deleteMany({
          where: { userId: row.userId, role: { in: row.rolesToRemove } },
        })
        stripped += 1
      }
    }

    console.log(`\nDone. Updated ${updated}, cleared ${cleared}, stripped roles on ${stripped}.`)
  } finally {
    await Promise.all([today.$disconnect(), sso.$disconnect()])
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
