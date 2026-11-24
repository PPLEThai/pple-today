import { afterEach, describe, expect, test, vi } from 'vitest'

import { openExternal } from './open-external'

const MINI_APP_UA = 'Mozilla/5.0 (iPhone) PPLETodayApp/2.17.0 MiniApp'
const PHONE_UA = 'Mozilla/5.0 (iPhone) Mobile/15E148'

/**
 * A stand-in page. `host` answers the bridge like PPLE Today would (ack, then
 * `answer`); without one there is no `ReactNativeWebView`, as in a browser.
 */
function page(options: {
  host?: Record<string, unknown> | 'silent'
  /** Whether `window.__ppleHost` lists `openExternal`. Defaults to set when there is a host. */
  flag?: boolean
}) {
  const posted: Record<string, unknown>[] = []
  const opened: unknown[][] = []
  const listeners: ((e: { source: null; data: unknown }) => void)[] = []
  const deliver = (data: unknown) => listeners.forEach((fn) => fn({ source: null, data }))
  const location = { href: 'https://app.pplethai.org/events/1' }

  vi.stubGlobal('navigator', { userAgent: options.host ? MINI_APP_UA : PHONE_UA })
  vi.stubGlobal('window', {
    location,
    open: (...args: unknown[]) => {
      opened.push(args)
      return null
    },
    addEventListener: (_: string, fn: (typeof listeners)[number]) => listeners.push(fn),
    removeEventListener: (_: string, fn: (typeof listeners)[number]) =>
      listeners.splice(listeners.indexOf(fn), 1),
    __ppleHost:
      (options.flag ?? !!options.host)
        ? { version: 1, capabilities: { openExternal: 1 } }
        : undefined,
    ReactNativeWebView: options.host
      ? {
          postMessage: (raw: string) => {
            const message = JSON.parse(raw)
            posted.push(message)
            if (options.host === 'silent') return
            const { requestId } = message
            queueMicrotask(() => {
              deliver({ type: 'pple:open-external-ack', requestId })
              deliver({
                type: 'pple:open-external-response',
                requestId,
                ...(options.host as object),
              })
            })
          },
        }
      : undefined,
  })
  return { posted, opened, location }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('openExternal inside PPLE Today', () => {
  test('asks the host to open the URL', async () => {
    const { posted, opened } = page({ host: { status: 'opened' } })

    expect(await openExternal('https://meet.example.com/abc')).toEqual({ status: 'opened' })
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      type: 'pple:open-external-request',
      version: 1,
      url: 'https://meet.example.com/abc',
    })
    expect(typeof posted[0].requestId).toBe('string')
    expect(opened).toHaveLength(0)
  })

  test('sends a relative URL resolved against the page', async () => {
    const { posted } = page({ host: { status: 'opened' } })
    await openExternal('/tickets/1.pdf')
    expect(posted[0].url).toBe('https://app.pplethai.org/tickets/1.pdf')
  })

  test('reports the host denying, with no browser fallback', async () => {
    const { opened } = page({ host: { status: 'denied', reason: 'unsupported' } })
    expect(await openExternal('tel:+6621234567')).toEqual({
      status: 'failed',
      reason: 'unsupported',
    })
    expect(opened).toHaveLength(0)
  })

  test('reads a reason it does not know as error', async () => {
    page({ host: { status: 'denied', reason: 'something-new' } })
    expect(await openExternal('https://meet.example.com')).toEqual({
      status: 'failed',
      reason: 'error',
    })
  })

  test('fails with error when the host does not ack', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { opened } = page({ host: 'silent' })
    const result = openExternal('https://meet.example.com')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(await result).toEqual({ status: 'failed', reason: 'error' })
    expect(opened).toHaveLength(0)
    warn.mockRestore()
  })
})

describe('openExternal elsewhere', () => {
  test('opens an https URL in a new window in a browser', async () => {
    const { opened } = page({})
    expect(await openExternal('https://meet.example.com/abc')).toEqual({ status: 'opened' })
    expect(opened).toEqual([['https://meet.example.com/abc', '_blank', 'noopener']])
  })

  test('uses window.open in a PPLE Today that does not list the capability', async () => {
    const { posted, opened } = page({ host: { status: 'opened' }, flag: false })
    expect(await openExternal('https://meet.example.com')).toEqual({ status: 'opened' })
    expect(posted).toHaveLength(0)
    expect(opened).toHaveLength(1)
  })

  test('navigates to mailto: and tel: rather than opening a window', async () => {
    const { opened, location } = page({})
    expect(await openExternal('mailto:someone@example.com')).toEqual({ status: 'opened' })
    expect(location.href).toBe('mailto:someone@example.com')
    expect(opened).toHaveLength(0)
  })

  test('opens synchronously, inside the tap', () => {
    const { opened } = page({})
    void openExternal('https://meet.example.com')
    expect(opened).toHaveLength(1)
  })
})

describe('openExternal URL checks', () => {
  test('refuses URLs it does not take, without asking anyone', async () => {
    const { posted, opened } = page({ host: { status: 'opened' } })
    for (const url of [
      'http://meet.example.com',
      'javascript:alert(1)',
      'data:text/html,hi',
      'https://user:pass@meet.example.com',
      '',
      `https://example.com/${'a'.repeat(8_192)}`,
    ]) {
      expect(await openExternal(url)).toEqual({ status: 'failed', reason: 'invalid-url' })
    }
    expect(posted).toHaveLength(0)
    expect(opened).toHaveLength(0)
  })
})
