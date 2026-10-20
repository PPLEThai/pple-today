import { describe, expect, test } from 'vitest'

import {
  ackReply,
  apiErrorCode,
  buildReplyScript,
  deniedReply,
  findMiniAppForUrl,
  hostnameOf,
  type MiniAppSession,
  okReply,
  originOf,
  parseBridgeRequest,
  parseRoleSwitchRequest,
  parseSessionRequest,
  resolvePageUrl,
  roleSwitchAckReply,
  roleSwitchCancelledReply,
  roleSwitchDeniedReply,
  roleSwitchSwitchedReply,
  roleSwitchUnchangedReply,
  SessionCache,
  toScriptJson,
} from './mini-app-bridge'

const request = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'pple:session-request',
    version: 1,
    requestId: 'req-1',
    clientId: 'client-1',
    ...overrides,
  })

const session = (expiresIn = 3600): MiniAppSession => ({
  accessToken: 'access',
  idToken: 'id',
  tokenType: 'Bearer',
  expiresIn,
})

describe('parseSessionRequest', () => {
  test('reads a v1 session request', () => {
    expect(parseSessionRequest(request())).toEqual({
      type: 'pple:session-request',
      version: 1,
      requestId: 'req-1',
      clientId: 'client-1',
    })
  })

  test('drops fields the request does not define', () => {
    expect(parseSessionRequest(request({ origin: 'https://evil.example' }))).not.toHaveProperty(
      'origin'
    )
  })

  test.each([
    ['not JSON', 'hello'],
    ['JSON that is not an object', '"pple:session-request"'],
    ['null', 'null'],
    ['another message type', request({ type: 'something-else' })],
    ['another version', request({ version: 2 })],
    ['a missing requestId', request({ requestId: undefined })],
    ['an empty requestId', request({ requestId: '' })],
    ['a numeric clientId', request({ clientId: 42 })],
    ['an oversized clientId', request({ clientId: 'x'.repeat(257) })],
  ])('ignores %s', (_, data) => {
    expect(parseSessionRequest(data)).toBeNull()
  })

  test('ignores data that is not a string', () => {
    expect(parseSessionRequest({ type: 'pple:session-request' })).toBeNull()
  })
})

describe('parseRoleSwitchRequest', () => {
  const roleSwitch = (overrides: Record<string, unknown> = {}) =>
    request({ type: 'pple:role-switch-request', ...overrides })

  test('reads a v1 role-switch request', () => {
    expect(parseRoleSwitchRequest(roleSwitch())).toEqual({
      type: 'pple:role-switch-request',
      version: 1,
      requestId: 'req-1',
      clientId: 'client-1',
    })
  })

  test('keeps the two request types apart', () => {
    expect(parseRoleSwitchRequest(request())).toBeNull()
    expect(parseSessionRequest(roleSwitch())).toBeNull()
    expect(parseBridgeRequest(roleSwitch())?.type).toBe('pple:role-switch-request')
    expect(parseBridgeRequest(request())?.type).toBe('pple:session-request')
  })

  test.each([
    ['another version', roleSwitch({ version: 2 })],
    ['a missing clientId', roleSwitch({ clientId: undefined })],
    ['an empty requestId', roleSwitch({ requestId: '' })],
    ['not JSON', '{'],
  ])('ignores %s', (_, data) => {
    expect(parseRoleSwitchRequest(data)).toBeNull()
  })
})

describe('originOf / hostnameOf', () => {
  test('reads the origin of a web URL', () => {
    expect(originOf('https://app.example.com:8443/th/page?x=1')).toBe(
      'https://app.example.com:8443'
    )
    expect(hostnameOf('https://app.example.com/th/')).toBe('app.example.com')
  })

  test.each(['about:blank', 'data:text/html,hi', 'file:///x', 'not a url', '', null, undefined])(
    'has no origin for %s',
    (url) => {
      expect(originOf(url)).toBeNull()
      expect(hostnameOf(url)).toBeNull()
    }
  )
})

describe('resolvePageUrl', () => {
  test('prefers the main frame URL when the event carries only its origin', () => {
    expect(resolvePageUrl('https://a.example', 'https://a.example/th/app?x=1')).toBe(
      'https://a.example/th/app?x=1'
    )
  })

  test('keeps the event URL when the main frame is on another origin', () => {
    expect(resolvePageUrl('https://iframe.example', 'https://a.example/th/')).toBe(
      'https://iframe.example'
    )
  })

  test('keeps the event URL when the main frame is unknown', () => {
    expect(resolvePageUrl('https://a.example/x', null)).toBe('https://a.example/x')
  })
})

describe('toScriptJson', () => {
  test('escapes characters that could break out of a script', () => {
    const json = toScriptJson({ name: '</script><script>alert(1)</script>\u2028\u2029' })
    expect(json).not.toMatch(/[<\u2028\u2029]/)
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>\u2028\u2029' })
  })
})

describe('buildReplyScript', () => {
  const run = (script: string, origin: string) => {
    const dispatched: unknown[] = []
    class FakeMessageEvent {
      constructor(
        public type: string,
        public init: { data: unknown }
      ) {}
    }
    const fakeWindow = { dispatchEvent: (event: FakeMessageEvent) => dispatched.push(event) }
    const result = new Function(
      'location',
      'window',
      'MessageEvent',
      `return eval(${JSON.stringify(script)})`
    )({ origin }, fakeWindow, FakeMessageEvent)
    return { dispatched, result }
  }

  test('dispatches the reply as a message event on the requesting origin', () => {
    const reply = okReply('req-1', session())
    const { dispatched, result } = run(
      buildReplyScript('https://a.example', reply),
      'https://a.example'
    )

    expect(result).toBe(true)
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]).toMatchObject({ type: 'message', init: { data: reply } })
  })

  test('delivers nothing once the page has moved to another origin', () => {
    const script = buildReplyScript('https://a.example', ackReply('req-1'))
    expect(run(script, 'https://b.example').dispatched).toHaveLength(0)
  })

  test('survives hostile strings in the payload', () => {
    const reply = okReply('req-1', {
      ...session(),
      accessToken: "'); alert(1); ('</script>\u2028",
    })
    const script = buildReplyScript('https://a.example', reply)

    expect(script).not.toContain('</script>')
    expect(run(script, 'https://a.example').dispatched[0]).toMatchObject({ init: { data: reply } })
  })
})

describe('replies', () => {
  test('match the protocol shapes', () => {
    expect(ackReply('r')).toEqual({ type: 'pple:session-ack', requestId: 'r' })
    expect(deniedReply('r', 'not-found')).toEqual({
      type: 'pple:session-response',
      requestId: 'r',
      status: 'denied',
      reason: 'not-found',
    })
    expect(okReply('r', session())).toEqual({
      type: 'pple:session-response',
      requestId: 'r',
      status: 'ok',
      session: session(),
    })
  })
})

describe('role-switch replies', () => {
  test('match the protocol shapes', () => {
    expect(roleSwitchAckReply('r')).toEqual({ type: 'pple:role-switch-ack', requestId: 'r' })
    expect(roleSwitchUnchangedReply('r')).toEqual({
      type: 'pple:role-switch-response',
      requestId: 'r',
      status: 'unchanged',
    })
    expect(roleSwitchCancelledReply('r')).toEqual({
      type: 'pple:role-switch-response',
      requestId: 'r',
      status: 'cancelled',
    })
    expect(roleSwitchDeniedReply('r', 'busy')).toEqual({
      type: 'pple:role-switch-response',
      requestId: 'r',
      status: 'denied',
      reason: 'busy',
    })
  })

  test('carries the new person and session after a switch', () => {
    expect(roleSwitchSwitchedReply('r', 42, session())).toEqual({
      type: 'pple:role-switch-response',
      requestId: 'r',
      status: 'switched',
      activePersonId: 42,
      session: session(),
    })
  })

  test('omits the session when there is none to give', () => {
    const reply = roleSwitchSwitchedReply('r', 42, null)
    expect(reply).toEqual({
      type: 'pple:role-switch-response',
      requestId: 'r',
      status: 'switched',
      activePersonId: 42,
    })
    expect(reply).not.toHaveProperty('session')
  })

  test('are delivered through the same origin-guarded script', () => {
    const script = buildReplyScript('https://a.example', roleSwitchCancelledReply('r'))
    expect(script).toContain('location.origin !== "https://a.example"')
    expect(script).toContain('"pple:role-switch-response"')
  })
})

describe('apiErrorCode', () => {
  test('reads the code from an API error', () => {
    expect(apiErrorCode({ status: 404, value: { error: { code: 'MINI_APP_NOT_FOUND' } } })).toBe(
      'MINI_APP_NOT_FOUND'
    )
  })

  test.each([null, undefined, new Error('network'), { value: 'Bad Gateway' }])(
    'has no code for %s',
    (error) => {
      expect(apiErrorCode(error)).toBeNull()
    }
  )
})

describe('findMiniAppForUrl', () => {
  const apps = [
    { slug: 'root', url: 'https://apps.example/' },
    { slug: 'vote', url: 'https://apps.example/vote' },
    { slug: 'vote-admin', url: 'https://apps.example/vote/admin/' },
    { slug: 'other', url: 'https://other.example/app' },
  ]

  test('picks the longest base path on the same origin', () => {
    expect(findMiniAppForUrl(apps, 'https://apps.example/vote/admin/users')?.slug).toBe(
      'vote-admin'
    )
    expect(findMiniAppForUrl(apps, 'https://apps.example/vote/123')?.slug).toBe('vote')
    expect(findMiniAppForUrl(apps, 'https://apps.example/voters')?.slug).toBe('root')
  })

  test('falls back to any app on the origin when no base path matches', () => {
    expect(findMiniAppForUrl(apps, 'https://other.example/')?.slug).toBe('other')
  })

  test('finds nothing on an unknown origin', () => {
    expect(findMiniAppForUrl(apps, 'https://unknown.example/')).toBeNull()
    expect(findMiniAppForUrl(undefined, 'https://apps.example/')).toBeNull()
  })
})

describe('SessionCache', () => {
  const clock = () => {
    let now = 1_000_000
    return { now: () => now, advance: (ms: number) => (now += ms) }
  }

  test('reuses a session with time to spare, reporting what is left', () => {
    const time = clock()
    const cache = new SessionCache(time.now)
    cache.set('client-1', 'https://a.example', session(3600))

    time.advance(600_000)

    expect(cache.get('client-1', 'https://a.example')).toEqual(session(3000))
  })

  test('drops a session within a minute of expiry', () => {
    const time = clock()
    const cache = new SessionCache(time.now)
    cache.set('client-1', 'https://a.example', session(120))

    time.advance(59_000)
    expect(cache.get('client-1', 'https://a.example')).not.toBeNull()

    time.advance(1_000)
    expect(cache.get('client-1', 'https://a.example')).toBeNull()
  })

  test('keeps clients and origins apart', () => {
    const cache = new SessionCache()
    cache.set('client-1', 'https://a.example', session())

    expect(cache.get('client-2', 'https://a.example')).toBeNull()
    expect(cache.get('client-1', 'https://b.example')).toBeNull()
  })

  test('forgets everything on clear', () => {
    const cache = new SessionCache()
    cache.set('client-1', 'https://a.example', session())
    cache.clear()

    expect(cache.get('client-1', 'https://a.example')).toBeNull()
  })
})
