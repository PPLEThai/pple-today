import { describe, expect, it } from 'vitest'

import {
  allowHaptic,
  HAPTIC_LIMIT,
  HAPTIC_WINDOW_MS,
  hostCapabilitiesScript,
  hostScript,
  isTrustedMiniAppOrigin,
  parseHapticMessage,
  parseReadyMessage,
  readyHoldScript,
} from './mini-app-capabilities'

describe('isTrustedMiniAppOrigin', () => {
  it('allows the apex and any subdomain of the party domains over https', () => {
    for (const url of [
      'https://pplethai.org',
      'https://pay.pplethai.org/th/app',
      'https://calm-plum-wolf.ppleth.ai/pay',
      'https://ppleth.ai',
      'https://peoplesparty.or.th',
      'https://a.b.peoplesparty.or.th',
      'https://PPLETHAI.org',
    ]) {
      expect(isTrustedMiniAppOrigin(url)).toBe(true)
    }
  })

  it('refuses lookalikes, other hosts, and anything that is not https', () => {
    for (const url of [
      'https://evilpplethai.org',
      'https://pplethai.org.evil.com',
      'https://evil.com/pplethai.org',
      'https://evil.com/?u=https://pplethai.org',
      'https://user@evil.com#pplethai.org',
      'https://xppleth.ai',
      'https://app.pages.dev',
      'http://pplethai.org',
      'ftp://pplethai.org',
      'about:blank',
      'not a url',
      '',
    ]) {
      expect(isTrustedMiniAppOrigin(url)).toBe(false)
    }
    expect(isTrustedMiniAppOrigin(null)).toBe(false)
    expect(isTrustedMiniAppOrigin(undefined)).toBe(false)
  })
})

describe('hostScript', () => {
  /** Runs the script against a stand-in page; returns the flag and what was posted. */
  function run(options: {
    href?: string
    top?: boolean
    meta?: string | null
    readyState?: string
    script?: string
    existing?: unknown
  }) {
    const page = new URL(options.href ?? 'https://calm-plum-wolf.ppleth.ai/pay')
    const posted: unknown[] = []
    const listeners: Record<string, () => void> = {}
    const window: Record<string, unknown> = {
      ReactNativeWebView: { postMessage: (m: string) => posted.push(JSON.parse(m)) },
    }
    window.top = options.top === false ? {} : window
    if (options.existing !== undefined) window.__ppleHost = options.existing
    const document = {
      readyState: options.readyState ?? 'loading',
      addEventListener: (name: string, fn: () => void) => (listeners[name] = fn),
      querySelector: () =>
        options.meta === null || options.meta === undefined
          ? null
          : { getAttribute: () => options.meta },
    }
    const location = { protocol: page.protocol, hostname: page.hostname }
    new Function('window', 'document', 'location', options.script ?? hostScript())(
      window,
      document,
      location
    )
    return { host: window.__ppleHost as any, posted, listeners }
  }

  it('lists every capability on a trusted page, frozen', () => {
    const { host } = run({})
    expect(host).toEqual({
      version: 1,
      capabilities: { ready: 1, saveFile: 1, haptics: 1, openExternal: 1 },
    })
    expect(Object.isFrozen(host)).toBe(true)
    expect(Object.isFrozen(host.capabilities)).toBe(true)
  })

  it('lists only `ready` on a page that is not trusted', () => {
    for (const href of [
      'https://app.pages.dev/',
      'http://pay.pplethai.org/',
      'https://evilpplethai.org/',
    ]) {
      expect(run({ href }).host.capabilities).toEqual({ ready: 1 })
    }
  })

  it('sets nothing in an iframe', () => {
    expect(run({ top: false }).host).toBeUndefined()
  })

  it('holds the loading screen only for the manual meta tag, at DOMContentLoaded', () => {
    const waiting = run({ meta: 'manual' })
    expect(waiting.posted).toEqual([])
    waiting.listeners.DOMContentLoaded()
    expect(waiting.posted).toEqual([{ type: 'pple:ready-hold', version: 1 }])

    const other = run({ meta: 'auto' })
    other.listeners.DOMContentLoaded()
    expect(other.posted).toEqual([])
    const none = run({})
    none.listeners.DOMContentLoaded()
    expect(none.posted).toEqual([])
  })

  it('sets the capabilities again at page finish only when nothing has, and never holds', () => {
    const script = hostCapabilitiesScript()
    const missed = run({ script, meta: 'manual', readyState: 'complete' })
    expect(missed.host.capabilities).toEqual({ ready: 1, saveFile: 1, haptics: 1, openExternal: 1 })
    expect(missed.posted).toEqual([])

    const existing = Object.freeze({ version: 1, capabilities: { ready: 1 } })
    expect(run({ script, existing }).host).toBe(existing)
    expect(run({ script, top: false }).host).toBeUndefined()
    expect(run({ script, href: 'https://app.pages.dev/' }).host.capabilities).toEqual({ ready: 1 })
  })

  it('has a hold part that sets no capabilities', () => {
    const hold = run({ script: readyHoldScript(), meta: 'manual', readyState: 'interactive' })
    expect(hold.host).toBeUndefined()
    expect(hold.posted).toEqual([{ type: 'pple:ready-hold', version: 1 }])
  })

  it('reads the tag at once when injected after loading (Android)', () => {
    const late = run({ meta: 'manual', readyState: 'interactive' })
    expect(late.posted).toEqual([{ type: 'pple:ready-hold', version: 1 }])
    expect(late.listeners.DOMContentLoaded).toBeUndefined()
  })
})

describe('parseHapticMessage', () => {
  const message = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({ type: 'pple:haptic', version: 1, style: 'success', ...overrides })

  it('reads a known style', () => {
    expect(parseHapticMessage(message())).toEqual({ style: 'success' })
    expect(parseHapticMessage(message({ style: 'selection' }))).toEqual({ style: 'selection' })
  })

  it('reads an unknown style as a haptic to ignore', () => {
    expect(parseHapticMessage(message({ style: 'buzz' }))).toEqual({ style: null })
    expect(parseHapticMessage(message({ style: undefined }))).toEqual({ style: null })
    expect(parseHapticMessage(message({ style: 'constructor' }))).toEqual({ style: null })
  })

  it('is null for anything else', () => {
    expect(parseHapticMessage(message({ version: 2 }))).toBeNull()
    expect(parseHapticMessage(message({ type: 'pple:ready' }))).toBeNull()
    expect(parseHapticMessage('{')).toBeNull()
    expect(parseHapticMessage(1)).toBeNull()
  })
})

describe('allowHaptic', () => {
  it('lets through the limit within the window, then drops the rest', () => {
    let history: number[] = []
    for (let i = 0; i < HAPTIC_LIMIT; i++) {
      const result = allowHaptic(history, 1_000 + i)
      expect(result.allowed).toBe(true)
      history = result.history
    }
    const dropped = allowHaptic(history, 1_000 + HAPTIC_LIMIT)
    expect(dropped.allowed).toBe(false)
    expect(dropped.history).toHaveLength(HAPTIC_LIMIT)
  })

  it('allows again once the earliest have left the window', () => {
    let history: number[] = []
    for (let i = 0; i < HAPTIC_LIMIT; i++) history = allowHaptic(history, 1_000).history
    expect(allowHaptic(history, 1_000 + HAPTIC_WINDOW_MS - 1).allowed).toBe(false)
    expect(allowHaptic(history, 1_000 + HAPTIC_WINDOW_MS).allowed).toBe(true)
  })
})

describe('parseReadyMessage', () => {
  it('reads hold and ready', () => {
    expect(parseReadyMessage(JSON.stringify({ type: 'pple:ready-hold', version: 1 }))).toBe('hold')
    expect(parseReadyMessage(JSON.stringify({ type: 'pple:ready', version: 1 }))).toBe('ready')
  })

  it('is null for anything else', () => {
    expect(parseReadyMessage(JSON.stringify({ type: 'pple:ready', version: 2 }))).toBeNull()
    expect(parseReadyMessage(JSON.stringify({ type: 'pple:haptic', version: 1 }))).toBeNull()
    expect(parseReadyMessage('nope')).toBeNull()
  })
})
