import { describe, expect, it } from 'vitest'

import {
  isInSaveFileCooldown,
  parseSaveFileBridgeRequest,
  parseSaveFileRequest,
  safeFileName,
  SAVE_FILE_COOLDOWN_MS,
  SAVE_FILE_MAX_BYTES,
  saveFileScript,
} from './mini-app-save-file'

const SECRET = 'a1b2c3d4e5f60718'
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUg=='

const message = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'pple:download-link',
    version: 1,
    secret: SECRET,
    fileName: 'promptpay-qr.png',
    mimeType: 'image/png',
    dataBase64: PNG_BASE64,
    ...overrides,
  })

describe('parseSaveFileRequest', () => {
  it('reads a save the injected script sent', () => {
    expect(parseSaveFileRequest(message(), SECRET)).toEqual({
      fileName: 'promptpay-qr.png',
      mimeType: 'image/png',
      kind: 'image',
      dataBase64: PNG_BASE64,
    })
    expect(
      parseSaveFileRequest(
        message({ mimeType: 'application/pdf', fileName: 'receipt.pdf' }),
        SECRET
      )?.kind
    ).toBe('document')
  })

  it('ignores a message a page forged without the secret', () => {
    expect(parseSaveFileRequest(message({ secret: 'guess' }), SECRET)).toBeNull()
    expect(parseSaveFileRequest(message({ secret: undefined }), SECRET)).toBeNull()
    expect(parseSaveFileRequest(message(), '')).toBeNull()
  })

  it('ignores types it does not save, data that is not base64, and files over the limit', () => {
    expect(parseSaveFileRequest(message({ mimeType: 'text/html' }), SECRET)).toBeNull()
    expect(parseSaveFileRequest(message({ mimeType: 'image/svg+xml' }), SECRET)).toBeNull()
    expect(parseSaveFileRequest(message({ dataBase64: 'not base64!' }), SECRET)).toBeNull()
    expect(parseSaveFileRequest(message({ dataBase64: '' }), SECRET)).toBeNull()
    expect(
      parseSaveFileRequest(
        message({ dataBase64: 'A'.repeat(Math.ceil(SAVE_FILE_MAX_BYTES / 3) * 4 + 4) }),
        SECRET
      )
    ).toBeNull()
  })

  it('reads common non-standard image types as the standard one', () => {
    expect(parseSaveFileRequest(message({ mimeType: 'image/jpg' }), SECRET)?.mimeType).toBe(
      'image/jpeg'
    )
    expect(parseSaveFileRequest(message({ mimeType: 'image/PJPEG' }), SECRET)?.mimeType).toBe(
      'image/jpeg'
    )
    expect(
      parseSaveFileRequest(message({ mimeType: 'image/x-png; foo=bar', fileName: 'a.png' }), SECRET)
    ).toMatchObject({ mimeType: 'image/png', fileName: 'a.png' })
  })

  it('ignores other bridge traffic and junk', () => {
    expect(
      parseSaveFileRequest(
        JSON.stringify({ type: 'pple:session-request', version: 1, requestId: 'r', clientId: 'c' }),
        SECRET
      )
    ).toBeNull()
    expect(parseSaveFileRequest('{', SECRET)).toBeNull()
    expect(parseSaveFileRequest(42, SECRET)).toBeNull()
    expect(parseSaveFileRequest(message({ version: 2 }), SECRET)).toBeNull()
  })
})

describe('parseSaveFileBridgeRequest', () => {
  const request = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      type: 'pple:save-file-request',
      version: 1,
      requestId: 'req-1',
      fileName: 'qr.png',
      mimeType: 'image/png',
      dataBase64: PNG_BASE64,
      ...overrides,
    })

  it('reads a non-standard image type as the standard one', () => {
    expect(
      parseSaveFileBridgeRequest(request({ mimeType: 'image/jpg', fileName: 'photo.jpg' }))
    ).toMatchObject({ ok: true, file: { mimeType: 'image/jpeg', fileName: 'photo.jpg' } })
  })

  it('reads an SDK saveFile() request, which needs no secret', () => {
    expect(parseSaveFileBridgeRequest(request())).toEqual({
      requestId: 'req-1',
      ok: true,
      file: { fileName: 'qr.png', mimeType: 'image/png', kind: 'image', dataBase64: PNG_BASE64 },
    })
  })

  it('answers a file it will not take with the reason', () => {
    expect(parseSaveFileBridgeRequest(request({ mimeType: 'text/csv' }))).toEqual({
      requestId: 'req-1',
      ok: false,
      reason: 'unsupported-type',
    })
    expect(
      parseSaveFileBridgeRequest(
        request({ dataBase64: 'A'.repeat(Math.ceil(SAVE_FILE_MAX_BYTES / 3) * 4 + 4) })
      )
    ).toMatchObject({ ok: false, reason: 'too-large' })
    expect(parseSaveFileBridgeRequest(request({ dataBase64: '!!' }))).toMatchObject({
      ok: false,
      reason: 'error',
    })
  })

  it('ignores what it cannot answer: no request id, another version, other messages', () => {
    expect(parseSaveFileBridgeRequest(request({ requestId: undefined }))).toBeNull()
    expect(parseSaveFileBridgeRequest(request({ requestId: 'x'.repeat(257) }))).toBeNull()
    expect(parseSaveFileBridgeRequest(request({ version: 2 }))).toBeNull()
    expect(parseSaveFileBridgeRequest(message())).toBeNull()
    expect(parseSaveFileBridgeRequest('{')).toBeNull()
  })
})

describe('isInSaveFileCooldown', () => {
  it('holds requests off for a second after a sheet closes', () => {
    expect(isInSaveFileCooldown(null, 5_000)).toBe(false)
    expect(isInSaveFileCooldown(5_000, 5_000)).toBe(true)
    expect(isInSaveFileCooldown(5_000, 5_000 + SAVE_FILE_COOLDOWN_MS - 1)).toBe(true)
    expect(isInSaveFileCooldown(5_000, 5_000 + SAVE_FILE_COOLDOWN_MS)).toBe(false)
  })
})

describe('safeFileName', () => {
  it('keeps a plain name and gives it the extension of its type', () => {
    expect(safeFileName('promptpay-qr.png', 'image/png')).toBe('promptpay-qr.png')
    expect(safeFileName('ใบเสร็จ', 'application/pdf')).toBe('ใบเสร็จ.pdf')
    expect(safeFileName('photo.jpeg', 'image/jpeg')).toBe('photo.jpg')
  })

  it('replaces a known image or PDF extension only, in any case', () => {
    expect(safeFileName('receipt.PDF', 'application/pdf')).toBe('receipt.pdf')
    expect(safeFileName('photo.HEIF', 'image/heic')).toBe('photo.heic')
    expect(safeFileName('photo.webp', 'image/png')).toBe('photo.png')
  })

  it('keeps a dotted name that does not end in a known extension', () => {
    expect(safeFileName('receipt.2026.pdf', 'application/pdf')).toBe('receipt.2026.pdf')
    expect(safeFileName('receipt.2026', 'application/pdf')).toBe('receipt.2026.pdf')
    expect(safeFileName('v1.2', 'image/png')).toBe('v1.2.png')
    expect(safeFileName('notes.txt', 'image/png')).toBe('notes.txt.png')
  })

  it('drops any path, control characters and reserved characters', () => {
    expect(safeFileName('../../Library/evil.png', 'image/png')).toBe('evil.png')
    expect(safeFileName('a\\b\\c:d?.png', 'image/png')).toBe('cd.png')
    expect(safeFileName('x\u0000y.png', 'image/png')).toBe('xy.png')
    expect(safeFileName('', 'image/png')).toBe('file.png')
    expect(safeFileName('a'.repeat(200), 'image/png')).toHaveLength(84)
  })
})

/** Runs the injected script against a stand-in page and returns what it posted and where it navigated. */
async function runScript(options: {
  href: string
  isTrusted?: boolean
  blob?: { type: string; size: number }
  ok?: boolean
  platform?: 'ios' | 'android'
  pageHref?: string
}) {
  const posted: string[] = []
  const page = new URL(options.pageHref ?? 'https://calm-plum-wolf.ppleth.ai/pay')
  const location = {
    href: page.href,
    origin: page.origin,
    protocol: page.protocol,
    hostname: page.hostname,
  }
  let listener: ((e: unknown) => void) | null = null
  let prevented = false
  const anchor = {
    href: options.href,
    getAttribute: (n: string) => (n === 'download' ? 'promptpay-qr.png' : null),
  }
  const window: Record<string, unknown> = {
    ReactNativeWebView: { postMessage: (m: string) => posted.push(m) },
    fetch: async () => ({
      ok: options.ok ?? true,
      blob: async () => options.blob ?? { type: 'image/png', size: 10 },
    }),
    FileReader: class {
      result = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL(b: { type: string }) {
        this.result = `data:${b.type};base64,${PNG_BASE64}`
        queueMicrotask(() => this.onload?.())
      }
    },
  }
  const document = { addEventListener: (_: string, fn: (e: unknown) => void) => (listener = fn) }
  new Function(
    'window',
    'document',
    'location',
    'URL',
    saveFileScript(SECRET, { platform: options.platform ?? 'ios' })
  )(window, document, location, URL)
  listener!({
    isTrusted: options.isTrusted ?? true,
    target: { closest: () => anchor },
    preventDefault: () => (prevented = true),
  })
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0))
  return { posted, prevented, navigatedTo: location.href }
}

describe('saveFileScript', () => {
  it("posts a same-origin download, with the page's cookies' file and the secret, instead of opening it", async () => {
    const { posted, prevented, navigatedTo } = await runScript({
      href: 'https://calm-plum-wolf.ppleth.ai/pay_1/charges/C/qr-card.png',
    })
    expect(prevented).toBe(true)
    expect(navigatedTo).toBe('https://calm-plum-wolf.ppleth.ai/pay')
    expect(posted).toHaveLength(1)
    expect(parseSaveFileRequest(posted[0], SECRET)).toMatchObject({
      fileName: 'promptpay-qr.png',
      mimeType: 'image/png',
      kind: 'image',
    })
  })

  it('on Android takes only blob: and data: links, leaving http(s) to the WebView', async () => {
    const sameOrigin = await runScript({
      href: 'https://calm-plum-wolf.ppleth.ai/qr.png',
      platform: 'android',
    })
    expect(sameOrigin.prevented).toBe(false)
    expect(sameOrigin.posted).toHaveLength(0)

    for (const href of [
      'blob:https://calm-plum-wolf.ppleth.ai/abc',
      'data:image/png;base64,AAAA',
    ]) {
      const run = await runScript({ href, platform: 'android' })
      expect(run.prevented).toBe(true)
      expect(run.posted).toHaveLength(1)
    }
  })

  it('does nothing on a page off the allowed domains or without https', async () => {
    for (const pageHref of [
      'https://app.pages.dev/pay',
      'https://evilpplethai.org/pay',
      'http://calm-plum-wolf.ppleth.ai/pay',
    ]) {
      const run = await runScript({ href: `${pageHref.split('/pay')[0]}/qr.png`, pageHref })
      expect(run.prevented).toBe(false)
      expect(run.posted).toHaveLength(0)
    }
  })

  it('leaves another origin and an untrusted (scripted) click to the WebView', async () => {
    expect((await runScript({ href: 'https://elsewhere.example/qr.png' })).prevented).toBe(false)
    const scripted = await runScript({
      href: 'https://calm-plum-wolf.ppleth.ai/qr.png',
      isTrusted: false,
    })
    expect(scripted.prevented).toBe(false)
    expect(scripted.posted).toHaveLength(0)
  })

  it('posts a non-standard image type as the standard one', async () => {
    const { posted } = await runScript({
      href: 'https://calm-plum-wolf.ppleth.ai/f.jpg',
      blob: { type: 'image/JPG; charset=x', size: 10 },
    })
    expect(JSON.parse(posted[0]).mimeType).toBe('image/jpeg')
  })

  it('opens the file as before when it is a type the host does not save, too big, or not there', async () => {
    for (const run of [
      { blob: { type: 'text/html', size: 10 } },
      { blob: { type: 'image/png', size: SAVE_FILE_MAX_BYTES + 1 } },
      { ok: false },
    ]) {
      const { posted, navigatedTo } = await runScript({
        href: 'https://calm-plum-wolf.ppleth.ai/f.png',
        ...run,
      })
      expect(posted).toHaveLength(0)
      expect(navigatedTo).toBe('https://calm-plum-wolf.ppleth.ai/f.png')
    }
  })
})
