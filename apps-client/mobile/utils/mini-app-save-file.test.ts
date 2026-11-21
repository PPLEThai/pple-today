import { describe, expect, it } from 'vitest'

import {
  parseSaveFileRequest,
  safeFileName,
  SAVE_FILE_MAX_BYTES,
  saveFileScript,
} from './mini-app-save-file'

const SECRET = 'a1b2c3d4e5f60718'
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUg=='

const message = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'pple:save-file',
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
      type: 'pple:save-file',
      version: 1,
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

describe('safeFileName', () => {
  it('keeps a plain name and gives it the extension of its type', () => {
    expect(safeFileName('promptpay-qr.png', 'image/png')).toBe('promptpay-qr.png')
    expect(safeFileName('ใบเสร็จ', 'application/pdf')).toBe('ใบเสร็จ.pdf')
    expect(safeFileName('photo.jpeg', 'image/jpeg')).toBe('photo.jpg')
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
}) {
  const posted: string[] = []
  const location = {
    href: 'https://calm-plum-wolf.ppleth.ai/pay',
    origin: 'https://calm-plum-wolf.ppleth.ai',
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
  new Function('window', 'document', 'location', 'URL', saveFileScript(SECRET))(
    window,
    document,
    location,
    URL
  )
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

  it('leaves another origin and an untrusted (scripted) click to the WebView', async () => {
    expect((await runScript({ href: 'https://elsewhere.example/qr.png' })).prevented).toBe(false)
    const scripted = await runScript({
      href: 'https://calm-plum-wolf.ppleth.ai/qr.png',
      isTrusted: false,
    })
    expect(scripted.prevented).toBe(false)
    expect(scripted.posted).toHaveLength(0)
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
