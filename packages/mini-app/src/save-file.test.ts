import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { SAVE_FILE_MAX_BYTES, saveFile } from './save-file'

const MINI_APP_UA = 'Mozilla/5.0 (iPhone) PPLETodayApp/2.17.0 MiniApp'
const PHONE_UA = 'Mozilla/5.0 (iPhone) Mobile/15E148'

type HostAnswer = Record<string, unknown> | 'silent'

/**
 * A stand-in page. `host` answers the bridge like PPLE Today would (ack, then
 * `answer`); without one there is no `ReactNativeWebView`, as in a browser.
 */
function page(options: {
  userAgent?: string
  host?: HostAnswer
  /** `window.__ppleHost`; PPLE Today sets it with a `saveFile` capability, an older one does not. Defaults to set when there is a host. */
  flag?: boolean
  phone?: boolean
  share?: (data: { files: File[] }) => Promise<void>
  canShare?: boolean
  fetch?: (url: string) => Promise<Response>
}) {
  const posted: Record<string, unknown>[] = []
  const downloads: { href: string; download: string }[] = []
  const listeners: ((e: { source: null; data: unknown }) => void)[] = []
  const deliver = (data: unknown) => listeners.forEach((fn) => fn({ source: null, data }))

  vi.stubGlobal('navigator', {
    userAgent: options.userAgent ?? (options.host ? MINI_APP_UA : PHONE_UA),
    canShare: options.share ? () => options.canShare ?? true : undefined,
    share: options.share,
  })
  vi.stubGlobal('window', {
    location: { href: 'https://app.example.com/pay' },
    matchMedia: () => ({ matches: options.phone ?? true }),
    addEventListener: (_: string, fn: (typeof listeners)[number]) => listeners.push(fn),
    removeEventListener: (_: string, fn: (typeof listeners)[number]) =>
      listeners.splice(listeners.indexOf(fn), 1),
    __ppleHost:
      (options.flag ?? !!options.host) ? { version: 1, capabilities: { saveFile: 1 } } : undefined,
    ReactNativeWebView: options.host
      ? {
          postMessage: (raw: string) => {
            const message = JSON.parse(raw)
            posted.push(message)
            if (options.host === 'silent') return
            const { requestId } = message
            queueMicrotask(() => {
              deliver({ type: 'pple:save-file-ack', requestId })
              deliver({ type: 'pple:save-file-response', requestId, ...(options.host as object) })
            })
          },
        }
      : undefined,
  })
  vi.stubGlobal('document', {
    body: { appendChild: () => {} },
    createElement: () => {
      const a = {
        href: '',
        download: '',
        rel: '',
        style: {},
        click: () => downloads.push({ href: a.href, download: a.download }),
        remove: () => {},
      }
      return a
    },
  })
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
  )
  if (options.fetch) vi.stubGlobal('fetch', options.fetch)
  return { posted, downloads }
}

/** Node has no `FileReader`; this one reads a blob into a data URL like the browser's. */
class FakeFileReader {
  result: string | null = null
  error: Error | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  static failWith: Error | null = null
  async readAsDataURL(blob: Blob) {
    const buffer = await blob.arrayBuffer()
    if (FakeFileReader.failWith) {
      this.error = FakeFileReader.failWith
      this.onerror?.()
      return
    }
    this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
    this.onload?.()
  }
}

const png = () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })

beforeEach(() => {
  FakeFileReader.failWith = null
  vi.stubGlobal('FileReader', FakeFileReader)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('saveFile inside PPLE Today', () => {
  test('hands the file to the host and reports the share sheet closing', async () => {
    const { posted, downloads } = page({ host: { status: 'presented' } })

    expect(await saveFile(png(), { fileName: 'qr.png' })).toEqual({ status: 'presented' })
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      type: 'pple:save-file-request',
      version: 1,
      fileName: 'qr.png',
      mimeType: 'image/png',
      dataBase64: 'iVBORw==',
    })
    expect(typeof posted[0].requestId).toBe('string')
    expect(downloads).toHaveLength(0)
  })

  test('sends a non-standard image type as the standard one', async () => {
    const { posted } = page({ host: { status: 'presented' } })
    const blob = (type: string) => new Blob([new Uint8Array([1, 2, 3])], { type })

    await saveFile(blob('image/JPG'))
    await saveFile(blob('image/pjpeg; q=1'))
    await saveFile(blob('image/x-png'))
    expect(posted.map((m) => m.mimeType)).toEqual(['image/jpeg', 'image/jpeg', 'image/png'])
  })

  test('fails with `error` when the file cannot be read', async () => {
    page({ host: { status: 'presented' } })
    FakeFileReader.failWith = new Error('read')
    expect(await saveFile(png())).toEqual({ status: 'failed', reason: 'error' })
  })

  test('fetches a URL and names the file after it', async () => {
    const { posted } = page({
      host: { status: 'presented' },
      fetch: async () => new Response(png()),
    })

    expect(await saveFile('/receipts/%E0%B9%83%E0%B8%9A.png')).toEqual({ status: 'presented' })
    expect(posted[0]).toMatchObject({ fileName: 'ใบ.png', mimeType: 'image/png' })
  })

  test('reports what the host refused', async () => {
    page({ host: { status: 'denied', reason: 'unsupported-type' } })
    expect(await saveFile(new Blob(['x'], { type: 'text/csv' }))).toEqual({
      status: 'failed',
      reason: 'unsupported-type',
    })
  })

  test('refuses a file over the limit without sending it', async () => {
    const { posted } = page({ host: { status: 'presented' } })
    const big = { size: SAVE_FILE_MAX_BYTES + 1, type: 'image/png' } as Blob

    expect(await saveFile(big)).toEqual({ status: 'failed', reason: 'too-large' })
    expect(posted).toHaveLength(0)
  })

  test('passes the new denial reasons on', async () => {
    for (const reason of ['insecure-origin', 'not-allowed', 'busy'] as const) {
      page({ host: { status: 'denied', reason } })
      expect(await saveFile(png())).toEqual({ status: 'failed', reason })
    }
  })

  test('never falls back: a host that does not ack in 30 s is an error', async () => {
    vi.useFakeTimers()
    const { downloads } = page({ host: 'silent', phone: false })

    const result = saveFile(png(), { fileName: 'qr.png' })
    await vi.advanceTimersByTimeAsync(3_000)
    let settled = false
    void result.then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false) // the 3 s a session request waits is not enough here

    await vi.advanceTimersByTimeAsync(27_000)
    expect(await result).toEqual({ status: 'failed', reason: 'error' })
    expect(downloads).toHaveLength(0)
  })

  test('goes straight to the browser when the host has set no flag', async () => {
    const { posted, downloads } = page({ host: 'silent', flag: false, phone: false })

    expect(await saveFile(png(), { fileName: 'qr.png' })).toEqual({ status: 'downloaded' })
    expect(posted).toHaveLength(0)
    expect(downloads).toEqual([{ href: 'blob:x', download: 'qr.png' }])
  })

  test('sends the mimeType option, normalised, instead of the blob type', async () => {
    const { posted } = page({ host: { status: 'presented' } })
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' })

    await saveFile(blob, { mimeType: 'Image/JPG; charset=x' })
    expect(posted[0]).toMatchObject({ mimeType: 'image/jpeg' })
  })
})

describe('saveFile in a browser', () => {
  test("uses the phone's share sheet when it can share files", async () => {
    const shared: File[][] = []
    const { downloads } = page({ share: async ({ files }) => void shared.push(files) })

    expect(await saveFile(png(), { fileName: 'qr.png' })).toEqual({ status: 'shared' })
    expect(shared[0][0].name).toBe('qr.png')
    expect(downloads).toHaveLength(0)
  })

  test('gives the browser the mimeType option too', async () => {
    const shared: File[][] = []
    page({ share: async ({ files }) => void shared.push(files) })
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' })

    await saveFile(blob, { fileName: 'a.jpg', mimeType: 'image/pjpeg' })
    expect(shared[0][0].type).toBe('image/jpeg')
  })

  test('reports a dismissed share sheet as cancelled', async () => {
    page({
      share: async () => {
        throw Object.assign(new Error('abort'), { name: 'AbortError' })
      },
    })
    expect(await saveFile(png())).toEqual({ status: 'cancelled' })
  })

  test('downloads when sharing is not allowed, not possible, or on a computer', async () => {
    const notAllowed = page({
      share: async () => {
        throw Object.assign(new Error('no tap'), { name: 'NotAllowedError' })
      },
    })
    expect(await saveFile(png(), { fileName: 'a.png' })).toEqual({ status: 'downloaded' })
    expect(notAllowed.downloads).toHaveLength(1)

    const cannot = page({ share: async () => {}, canShare: false })
    expect(await saveFile(png())).toEqual({ status: 'downloaded' })
    expect(cannot.downloads).toEqual([{ href: 'blob:x', download: 'file' }])

    const computer = page({ share: async () => {}, phone: false })
    expect(await saveFile(png())).toEqual({ status: 'downloaded' })
    expect(computer.downloads).toHaveLength(1)
  })

  test('reports a URL it could not fetch', async () => {
    page({ fetch: async () => new Response('nope', { status: 404 }) })
    expect(await saveFile('/missing.png')).toEqual({ status: 'failed', reason: 'fetch-failed' })

    page({ fetch: async () => Promise.reject(new TypeError('cors')) })
    expect(await saveFile('https://elsewhere.example/x.png')).toEqual({
      status: 'failed',
      reason: 'fetch-failed',
    })
  })
})
