/**
 * One-time backfill: register the platform edge door's callback
 * (`/.pple/auth/callback`) as an allowed redirect URI on every already-provisioned
 * Builder App's OIDC client.
 *
 * New apps get the callback at create time, and it is re-synced whenever an app's
 * URL changes (see `PlatformMiniAppService`). Apps provisioned before the door
 * existed — whose URL never changes — would otherwise never have it, so the door's
 * PKCE flow would fail for the whole existing fleet. Run this once before enabling
 * the door. See `docs/platform-web-door-dependencies.md` (criterion a).
 *
 * DRY-RUN by default; pass --execute to write to Zitadel. Idempotent: it sets the
 * same redirect-URI pair the create/update paths do, so re-running is harmless.
 * Requires DATABASE_URL and the ZITADEL_* env vars.
 * Do not run without explicit approval.
 *
 * Usage:
 *   tsx scripts/backfill-door-redirect-uris.ts [--execute]
 */
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { MiniAppSource, PrismaClient } from '@pple-today/database/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

// Import the pure ZitadelService class, not the Elysia plugin barrel — the barrel
// wires ConfigServicePlugin, which validates the full app env at load time.
import { ZitadelService } from '../src/modules/admin/zitadel/zitadel-service'
import { doorRedirectUris } from '../src/modules/platform/mini-app-service'

const EXECUTE = process.argv.includes('--execute')
const SHOW_HELP = process.argv.includes('--help') || process.argv.includes('-h')

function printHelp() {
  console.log(`
Backfill the edge door's redirect URI onto existing Builder Apps' OIDC clients.

Usage:
  tsx scripts/backfill-door-redirect-uris.ts [--execute]

Options:
  --execute   Write the redirect URIs to Zitadel. Without this flag the script
              runs as a dry-run: it only prints what it would change.
  --help,-h   Show this help.

Env: DATABASE_URL, ZITADEL_API_URL, ZITADEL_PAT, ZITADEL_PROJECT_ID,
     ZITADEL_ORG_ID (optional), ZITADEL_LOGIN_V2_BASE_URI.
`)
}

// The script talks straight to the Zitadel Management API via ZitadelService,
// which only ever calls `.error` on its logger — a console shim is enough.
const logger = {
  error: (payload: unknown) => console.error(payload),
} as unknown as ElysiaLoggerInstance

async function main() {
  if (SHOW_HELP) {
    printHelp()
    return
  }

  const connectionString = `${process.env.DATABASE_URL}`
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

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
      select: { slug: true, clientUrl: true, zitadelAppId: true },
    })

    console.log(`${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: ${apps.length} platform app(s) to backfill.\n`)

    let updated = 0
    let failed = 0
    for (const app of apps) {
      const redirectUris = doorRedirectUris(app.clientUrl)
      console.log(`- ${app.slug} (${app.zitadelAppId}) → ${redirectUris.join(', ')}`)

      if (!EXECUTE) continue

      const result = await zitadelService.updateOidcApp(app.zitadelAppId!, { redirectUris })
      if (result.isErr()) {
        failed += 1
        console.error(`  ✗ failed: ${result.error.code} — ${result.error.message}`)
      } else {
        updated += 1
      }
    }

    if (EXECUTE) {
      console.log(`\nDone. Updated ${updated}, failed ${failed}.`)
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
