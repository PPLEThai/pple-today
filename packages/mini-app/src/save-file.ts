import { hasCapability, requestSaveFileFromHost } from './bridge'
import type { SaveFileDeniedReason } from './models'

// See BRIDGE.md ("Saving a file").

/** The largest file PPLE Today takes (bytes); the host refuses bigger ones too. */
export const SAVE_FILE_MAX_BYTES = 10 * 1024 * 1024

export type SaveFileOptions = {
  /**
   * The name to save it under. Defaults to a `File`'s own name, else the URL's
   * last path segment, else `file`.
   */
  fileName?: string
  /**
   * The file's type, when the `Blob`'s own is wrong or empty: a server that
   * sends `application/octet-stream`, say. It replaces `blob.type`, in lower
   * case and without parameters (`image/jpg` is read as `image/jpeg`), for
   * PPLE Today and for the browser's share sheet or download.
   */
  mimeType?: string
}

/**
 * How a `saveFile()` call ended.
 *
 * - `presented`: PPLE Today's share sheet was shown and has closed. Whether
 *   the user saved the file is not reported.
 * - `shared`: the browser's share sheet (`navigator.share`) resolved, so the
 *   user picked a target.
 * - `downloaded`: a browser download was started.
 * - `cancelled`: the user closed the browser's share sheet without choosing.
 * - `failed`: nothing was shown; `reason` says why. Inside PPLE Today there
 *   is no browser fallback after a failure.
 */
export type SaveFileResult =
  | { status: 'presented' }
  | { status: 'shared' }
  | { status: 'downloaded' }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: 'fetch-failed' | SaveFileDeniedReason }

/** Common non-standard names for the types PPLE Today saves; the host reads them the same way. */
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
}

function canonicalMimeType(type: string): string {
  const base = type.split(';')[0].trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(MIME_ALIASES, base) ? MIME_ALIASES[base] : base
}

function nameFromUrl(url: string): string | undefined {
  try {
    const last = new URL(url, window.location.href).pathname.split('/').pop()
    return last ? decodeURIComponent(last) : undefined
  } catch {
    return undefined
  }
}

/** The base64 of a blob's bytes: a data URL from `FileReader`, without its prefix. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

function download(blob: Blob, fileName: string): SaveFileResult {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // The download has its own copy once it starts; give it a moment first.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return { status: 'downloaded' }
}

/**
 * On a phone, the browser's share sheet is where Save Image is. On a computer
 * a share dialog is no way to save a file, so it downloads.
 */
async function shareOrDownload(blob: Blob, fileName: string): Promise<SaveFileResult> {
  const file = new File([blob], fileName, { type: blob.type })
  const isPhone =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  if (
    isPhone &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] })
      return { status: 'shared' }
    } catch (error) {
      if ((error as { name?: string } | null)?.name === 'AbortError') return { status: 'cancelled' }
      // NotAllowedError: the tap that started this has expired (a slow fetch).
      // A download needs no tap.
    }
  }
  return download(blob, fileName)
}

/**
 * Saves a file the app has — a `Blob`/`File` it made, or a URL to fetch — the
 * way the device saves files.
 *
 * Inside PPLE Today the host opens the share sheet with it (Save Image puts an
 * image in Photos), and only on the party's own domains; a page it refuses
 * fails with `not-allowed` or `insecure-origin`. In a browser (and in an older
 * PPLE Today, which lists no `saveFile` capability), on a phone the browser's
 * share sheet if it can share files; otherwise, and on a computer, a download. A URL is fetched
 * by the page (with its cookies, for the same origin), so it may be on another
 * origin only if that origin allows it (CORS).
 *
 * PPLE Today saves PNG, JPEG, GIF, WebP, HEIC and PDF files of up to 10 MB.
 *
 * Call it from a tap: the browser's share sheet needs one. Never rejects.
 */
export async function saveFile(
  source: Blob | string,
  options: SaveFileOptions = {}
): Promise<SaveFileResult> {
  let blob: Blob
  if (typeof source === 'string') {
    try {
      const response = await fetch(source)
      if (!response.ok) return { status: 'failed', reason: 'fetch-failed' }
      blob = await response.blob()
    } catch {
      return { status: 'failed', reason: 'fetch-failed' }
    }
  } else {
    blob = source
  }

  const fileName =
    options.fileName ||
    (typeof File !== 'undefined' && blob instanceof File ? blob.name : undefined) ||
    (typeof source === 'string' ? nameFromUrl(source) : undefined) ||
    'file'

  const mimeType = canonicalMimeType(options.mimeType ?? blob.type)
  // Re-wrapped so the browser's share sheet and download carry the type too.
  if (options.mimeType !== undefined && mimeType !== blob.type) {
    blob = new Blob([blob], { type: mimeType })
  }

  try {
    // PPLE Today's capability list: a host that offers `saveFile` is there, so whatever happens
    // next is its answer. No fallback, or both flows could open.
    if (hasCapability('saveFile')) {
      if (blob.size > SAVE_FILE_MAX_BYTES) return { status: 'failed', reason: 'too-large' }
      const response = await requestSaveFileFromHost({
        fileName,
        mimeType,
        dataBase64: await toBase64(blob),
      })
      if (response.status === 'presented') return { status: 'presented' }
      if (response.status === 'denied') return { status: 'failed', reason: response.reason }
      return { status: 'failed', reason: 'error' }
    }
    return await shareOrDownload(blob, fileName)
  } catch (error) {
    console.warn('[PPLE Mini App] Save file failed', error)
    return { status: 'failed', reason: 'error' }
  }
}
