import { hasBridge, requestSaveFileFromHost } from './bridge'

// See BRIDGE.md ("Saving a file").

/** The largest file PPLE Today takes (bytes); the host refuses bigger ones too. */
export const SAVE_FILE_MAX_BYTES = 10 * 1024 * 1024

export type SaveFileOptions = {
  /**
   * The name to save it under. Defaults to a `File`'s own name, else the URL's
   * last path segment, else `file`.
   */
  fileName?: string
}

/**
 * How a `saveFile()` call ended.
 *
 * - `shared`: a share sheet was shown (PPLE Today's, or the browser's on a
 *   phone) and has closed. Whether the user saved the file is not reported.
 * - `downloaded`: a browser download was started.
 * - `cancelled`: the user closed the browser's share sheet without choosing.
 * - `failed`: nothing was shown; `reason` says why.
 */
export type SaveFileResult =
  | { status: 'shared' }
  | { status: 'downloaded' }
  | { status: 'cancelled' }
  | {
      status: 'failed'
      reason: 'fetch-failed' | 'unsupported-type' | 'too-large' | 'busy' | 'error'
    }

function nameFromUrl(url: string): string | undefined {
  try {
    const last = new URL(url, window.location.href).pathname.split('/').pop()
    return last ? decodeURIComponent(last) : undefined
  } catch {
    return undefined
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // In slices: spreading megabytes into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as unknown as number[])
  }
  return btoa(binary)
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
 * image in Photos). In a browser on a phone, the browser's share sheet if it
 * can share files; otherwise, and on a computer, a download. A URL is fetched
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

  try {
    if (hasBridge()) {
      if (blob.size > SAVE_FILE_MAX_BYTES) return { status: 'failed', reason: 'too-large' }
      const mimeType = blob.type.split(';')[0].trim().toLowerCase()
      const response = await requestSaveFileFromHost({
        fileName,
        mimeType,
        dataBase64: await toBase64(blob),
      })
      if (response.status === 'shared') return { status: 'shared' }
      if (response.status === 'denied') return { status: 'failed', reason: response.reason }
      // An older PPLE Today that does not answer: try what a browser would.
    }
    return await shareOrDownload(blob, fileName)
  } catch (error) {
    console.warn('[PPLE Mini App] Save file failed', error)
    return { status: 'failed', reason: 'error' }
  }
}
