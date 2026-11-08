/**
 * One-time backfill: rename every Builder App's Zitadel OIDC app to the app's
 * current name.
 *
 * A rename from the PPLE Platform (`PATCH /platform/mini-apps/:id { name }`)
 * used to update only the mini-app row, never the Zitadel app, so every Builder
 * App renamed before that was fixed still carries its original name in Zitadel.
 * New renames now reach Zitadel (see `PlatformMiniAppService.updateMiniApp`);
 * this brings the existing fleet in line.
 *
 * DRY-RUN by default; pass --execute to write to Zitadel. Only apps whose
 * Zitadel name differs from the row are touched, so re-running is harmless.
 * Requires DATABASE_URL and the ZITADEL_* env vars.
 * Do not run without explicit approval.
 *
 * Usage:
 *   bun scripts/backfill-zitadel-app-names.ts [--execute]
 */
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { MiniAppSource, PrismaClient } from '@pple-today/database/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

// Import the pure ZitadelService class, not the Elysia plugin barrel — the barrel
// wires ConfigServicePlugin, which validates the full app env at load time.
import { ZitadelService } from '../src/modules/admin/zitadel/zitadel-service'

const EXECUTE = process.argv.includes('--execute')
const SHOW_HELP = process.argv.includes('--help') || process.argv.includes('-h')

function printHelp() {
  console.log(`
Rename existing Builder Apps' Zitadel OIDC apps to the apps' current names.

Usage:
  bun scripts/backfill-zitadel-app-names.ts [--execute]

Options:
  --execute   Write the names to Zitadel. Without this flag the script runs as
              a dry-run: it only prints what it would change.
  --help,-h   Show this help.

Env: DATABASE_URL, ZITADEL_API_URL, ZITADEL_PAT, ZITADEL_PROJECT_ID,
     ZITADEL_ORG_ID (optional), ZITADEL_LOGIN_V2_BASE_URI.
`)
}

// ZitadelService only ever calls `.error` on its logger — a console shim is enough.
const logger = {
  error: (payload: unknown) => console.error(payload),
} as unknown as ElysiaLoggerInstance

async function main() {
  if (SHOW_HELP) {
    printHelp()
    return
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` }),
  })

  const zitadelService = new ZitadelService(
    {
      apiUrl: process.env.ZITADEL_API_URL,
      pat: process.env.ZITADEL_PAT,
      projectId: process.env.ZITADEL_PROJECT_ID,
      orgId: process.env.ZITADEL_ORG_ID,
      loginV2BaseUri: `${process.env.ZITADEL_LOGIN_V2_BASE_URI}`,
    },
    logger
  )

  try {
    // Only platform-provisioned, non-retired apps that own a Zitadel app.
    // Central-team (ADMIN) clients are managed elsewhere and left untouched.
    const apps = await prisma.miniApp.findMany({
      where: { source: MiniAppSource.PLATFORM, retiredAt: null, zitadelAppId: { not: null } },
      select: { slug: true, name: true, zitadelAppId: true },
    })

    const zitadelApps = await zitadelService.listOidcApps()
    if (zitadelApps.isErr()) {
      throw new Error(`listing Zitadel apps failed: ${zitadelApps.error.message}`)
    }
    const zitadelNames = new Map(zitadelApps.value.map((app) => [app.appId, app.name]))

    const stale = apps.filter((app) => zitadelNames.get(app.zitadelAppId!) !== app.name)
    console.log(
      `${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: ${stale.length} of ${apps.length} platform app(s) need a rename.\n`
    )

    let renamed = 0
    let failed = 0
    for (const app of stale) {
      const current = zitadelNames.get(app.zitadelAppId!)
      console.log(
        `- ${app.slug} (${app.zitadelAppId}): ${current === undefined ? '<not found in Zitadel>' : JSON.stringify(current)} → ${JSON.stringify(app.name)}`
      )

      if (!EXECUTE) continue

      const result = await zitadelService.updateOidcApp(app.zitadelAppId!, { name: app.name })
      if (result.isErr()) {
        failed += 1
        console.error(`  ✗ failed: ${result.error.code} — ${result.error.message}`)
      } else {
        renamed += 1
      }
    }

    if (EXECUTE) {
      console.log(`\nDone. Renamed ${renamed}, failed ${failed}.`)
      if (failed > 0) process.exitCode = 1
    } else {
      console.log(`\nDry-run only. Re-run with --execute to apply.`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
