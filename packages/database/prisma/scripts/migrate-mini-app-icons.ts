/**
 * Migrates MiniApp.icon from base64 data URIs to hosted public URLs.
 * DRY-RUN by default; pass --execute to upload to GCS and update the database.
 * Requires DATABASE_URL and GCP_* env vars.
 * Do not run without explicit approval.
 */
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import { Storage } from '@google-cloud/storage'
import { PrismaPg } from '@prisma/adapter-pg'
import sharp from 'sharp'

import { PrismaClient } from '../../__generated__/prisma'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
})

const ICON_SIZE = 256
const PUBLIC_ICON_PREFIX = 'public/mini-app'

const EXECUTE = process.argv.includes('--execute')
const SHOW_HELP = process.argv.includes('--help') || process.argv.includes('-h')

function printHelp() {
  console.log(`
Migrate MiniApp.icon from base64 data URIs to hosted public URLs.

Usage:
  tsx prisma/scripts/migrate-mini-app-icons.ts [--execute]

Options:
  --execute   Upload converted icons to GCS and update the database.
              Without this flag, the script runs as a dry-run: it only
              downloads/converts icons in-memory and prints a summary.
  --help, -h  Show this help message and exit.

Required environment variables:
  DATABASE_URL
  GCP_PROJECT_ID
  GCP_STORAGE_BUCKET_NAME
  GCP_CLIENT_EMAIL
  GCP_PRIVATE_KEY
`)
}

interface DataUri {
  mimeType: string
  buffer: Buffer
}

function parseDataUri(dataUri: string): DataUri | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUri)
  if (!match) return null

  const [, mimeType, isBase64, payload] = match

  const buffer = isBase64
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'utf-8')

  return { mimeType, buffer }
}

/**
 * Converts an arbitrary image buffer (png/jpeg/webp/svg/...) into a
 * 256x256 PNG buffer. Uses fit: 'contain' with a transparent background
 * so the source aspect ratio is preserved without distortion.
 */
async function convertToPng256(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { density: 384 })
    .resize(ICON_SIZE, ICON_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}

function findOxipngPath(): string | null {
  const which = spawnSync('which', ['oxipng'], { encoding: 'utf-8' })
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim()
  }
  return null
}

/**
 * Optionally runs oxipng on a PNG buffer to further optimize file size.
 * Skips silently (with a log note) if the oxipng binary is not on PATH.
 */
async function optimizeWithOxipng(pngBuffer: Buffer, oxipngPath: string | null): Promise<Buffer> {
  if (!oxipngPath) {
    return pngBuffer
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-app-icon-'))
  const tmpFile = path.join(tmpDir, 'icon.png')

  try {
    await fs.writeFile(tmpFile, pngBuffer)

    const result = spawnSync(oxipngPath, ['-o', '4', '--strip', 'safe', tmpFile], {
      encoding: 'utf-8',
    })

    if (result.status !== 0) {
      console.warn(
        `  [oxipng] optimization failed (exit ${result.status}), using unoptimized PNG. stderr: ${result.stderr}`
      )
      return pngBuffer
    }

    return await fs.readFile(tmpFile)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

function createStorage(): { storage: Storage; bucketName: string } {
  const projectId = process.env.GCP_PROJECT_ID
  const clientEmail = process.env.GCP_CLIENT_EMAIL
  const privateKey = process.env.GCP_PRIVATE_KEY
  const bucketName = process.env.GCP_STORAGE_BUCKET_NAME

  if (!bucketName) {
    throw new Error('GCP_STORAGE_BUCKET_NAME is required to upload icons')
  }

  const storage = new Storage({
    projectId,
    credentials:
      clientEmail && privateKey
        ? {
            client_email: clientEmail,
            private_key: privateKey,
          }
        : undefined,
  })

  return { storage, bucketName }
}

interface MigrationRow {
  id: string
  slug: string
  oldIconType: string
  sizeBefore: number
  sizeAfterPng: number
  plannedUrl: string
}

async function main() {
  if (SHOW_HELP) {
    printHelp()
    return
  }

  if (EXECUTE) {
    console.log(`
##############################################################
#                                                            #
#   WARNING: --execute mode is ON.                          #
#   This will UPLOAD files to GCS and UPDATE the database.   #
#   Press Ctrl+C now to abort if this was not intended.      #
#                                                            #
##############################################################
`)
  } else {
    console.log(
      'Running in DRY-RUN mode (no uploads, no database writes). Pass --execute to apply changes.\n'
    )
  }

  const totalMiniApps = await prisma.miniApp.count()

  const candidates = await prisma.miniApp.findMany({
    where: { icon: { startsWith: 'data:' } },
  })

  console.log(
    `Found ${totalMiniApps} total mini apps, ${candidates.length} with base64 data URI icons to migrate.\n`
  )

  if (candidates.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  const oxipngPath = findOxipngPath()
  if (oxipngPath) {
    console.log(`Found oxipng at ${oxipngPath}, will use it to optimize PNGs.\n`)
  } else {
    console.log('oxipng binary not found on PATH, skipping PNG optimization step.\n')
  }

  const { storage, bucketName } = EXECUTE
    ? createStorage()
    : {
        storage: null as unknown as Storage,
        bucketName: process.env.GCP_STORAGE_BUCKET_NAME ?? '<GCP_STORAGE_BUCKET_NAME>',
      }

  const summary: MigrationRow[] = []

  for (const miniApp of candidates) {
    if (!miniApp.icon) continue

    console.log(`Processing ${miniApp.slug} (${miniApp.id})...`)

    const parsed = parseDataUri(miniApp.icon)
    if (!parsed) {
      console.warn(`  Skipping ${miniApp.id}: could not parse data URI`)
      continue
    }

    const { mimeType, buffer: sourceBuffer } = parsed

    let pngBuffer: Buffer
    try {
      pngBuffer = await convertToPng256(sourceBuffer)
    } catch (error) {
      console.error(
        `  Skipping ${miniApp.id}: failed to convert image (${(error as Error).message})`
      )
      continue
    }

    const optimizedBuffer = await optimizeWithOxipng(pngBuffer, oxipngPath)

    const destination = `${PUBLIC_ICON_PREFIX}/mini-app-${miniApp.id}.png`

    let plannedUrl: string
    if (EXECUTE) {
      const bucket = storage.bucket(bucketName)
      const file = bucket.file(destination)

      await file.save(optimizedBuffer, {
        contentType: 'image/png',
        metadata: {
          cacheControl: 'public, max-age=86400',
        },
      })

      plannedUrl = file.publicUrl()

      await prisma.miniApp.update({
        where: { id: miniApp.id },
        data: { icon: plannedUrl },
      })

      console.log(`  Uploaded and updated -> ${plannedUrl}`)
    } else {
      plannedUrl = `https://storage.googleapis.com/${bucketName}/${destination}`
    }

    summary.push({
      id: miniApp.id,
      slug: miniApp.slug,
      oldIconType: mimeType,
      sizeBefore: sourceBuffer.length,
      sizeAfterPng: optimizedBuffer.length,
      plannedUrl,
    })
  }

  console.log('\nSummary:')
  console.table(summary)

  if (!EXECUTE) {
    console.log('\nDry-run complete. No files were uploaded and no database rows were changed.')
    console.log(
      'Re-run with --execute to upload the converted icons to GCS and update the database.'
    )
  } else {
    console.log(
      `\nDone. Migrated ${summary.length} of ${candidates.length} candidate mini app icons.`
    )
  }
}

main()
  .then(() => {
    return prisma.$disconnect()
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
    return prisma.$disconnect()
  })
