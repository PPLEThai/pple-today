import { describe, expect, test } from 'vitest'

import {
  ATTEMPT_ID_ALPHABET,
  ATTEMPT_ID_LENGTH,
  createConnectTrace,
  describeApiError,
  describeErrorForTrace,
  describeGraphError,
  generateAttemptId,
  MAX_TRACE_STEPS,
  MAX_TRACE_STEPS_JSON_LENGTH,
  redactSecrets,
  referenceCodeFromAttemptId,
  sanitizeForTrace,
  summarizeGraphPermissions,
} from './facebook-connect-trace'

const TOKEN = 'EAAGm0PX4ZCpsBAKZCZBabcdefghijklmnop1234567890'
const CONTEXT = { platform: 'ios', osVersion: '18.1', appVersion: '2.14.1' }

describe('generateAttemptId', () => {
  test('is 16 characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const id = generateAttemptId()
      expect(id).toHaveLength(ATTEMPT_ID_LENGTH)
      expect(id).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/)
    }
  })

  test('never uses look-alike characters', () => {
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      expect(ATTEMPT_ID_ALPHABET).not.toContain(ambiguous)
    }
  })

  test('covers the whole alphabet, including its last character', () => {
    expect(generateAttemptId(() => 0)).toBe('A'.repeat(16))
    expect(generateAttemptId(() => 0.999999)).toBe('9'.repeat(16))
  })
})

describe('referenceCodeFromAttemptId', () => {
  test('is the first 6 characters', () => {
    expect(referenceCodeFromAttemptId('K7QX2MABCDEFGHJK')).toBe('K7QX2M')
  })
})

describe('redactSecrets', () => {
  test.each([
    [`token is ${TOKEN}`, 'token is [REDACTED]'],
    [
      'https://graph.facebook.com/me?access_token=abc123&limit=1',
      'https://graph.facebook.com/me?access_token=[REDACTED]&limit=1',
    ],
    ['{"access_token":"abc123","id":"1"}', '{"access_token":"[REDACTED]","id":"1"}'],
    ['accessToken: abc123', 'accessToken: [REDACTED]'],
    ['Authorization: Bearer abc.def', 'Authorization: Bearer [REDACTED]'],
  ])('redacts %s', (input, expected) => {
    expect(redactSecrets(input)).toBe(expected)
  })

  test('keeps codes and ordinary messages', () => {
    const text = 'Login Failed: com.facebook.sdk.login 308 The operation could not be completed'
    expect(redactSecrets(text)).toBe(text)
  })
})

describe('sanitizeForTrace', () => {
  test('drops token-like keys at any depth, including Graph page access tokens', () => {
    const graph = {
      data: [{ id: '1', name: 'เพจ', access_token: TOKEN }],
      accessToken: TOKEN,
      nested: { pageAccessToken: TOKEN, secret: 'x', ok: true },
    }
    const sanitized = sanitizeForTrace(graph)
    expect(sanitized).toEqual({ data: [{ id: '1', name: 'เพจ' }], nested: { ok: true } })
    expect(JSON.stringify(sanitized)).not.toContain(TOKEN)
  })

  test('redacts tokens inside strings', () => {
    expect(sanitizeForTrace({ url: `?access_token=${TOKEN}` })).toEqual({
      url: '?access_token=[REDACTED]',
    })
  })

  test('bounds strings, arrays and depth', () => {
    const sanitized = sanitizeForTrace({
      long: 'a'.repeat(2000),
      list: Array.from({ length: 30 }, (_, i) => i),
      deep: { a: { b: { c: { d: 1 } } } },
    }) as { long: string; list: unknown[]; deep: unknown }
    expect(sanitized.long.length).toBeLessThanOrEqual(501)
    expect(sanitized.list).toHaveLength(21)
    expect(sanitized.list[20]).toBe('[+10 more]')
    expect(sanitized.deep).toEqual({ a: { b: { c: '[…]' } } })
  })
})

describe('describeErrorForTrace', () => {
  test('keeps what the RN bridge passes for a native SDK rejection', () => {
    const error = Object.assign(new Error('Login Failed'), {
      code: 'FacebookSDK',
      domain: 'com.facebook.sdk.login',
      userInfo: {},
    })
    expect(describeErrorForTrace(error)).toEqual({
      name: 'Error',
      message: 'Login Failed',
      domain: 'com.facebook.sdk.login',
      code: 'FacebookSDK',
      userInfo: {},
    })
  })

  test('reads the native code from a patched SDK message', () => {
    const error = Object.assign(
      new Error('Login Failed: com.facebook.sdk.login 308 The operation could not be completed'),
      { code: 'FacebookSDK' }
    )
    expect(describeErrorForTrace(error)).toMatchObject({
      domain: 'com.facebook.sdk.login',
      code: '308',
    })
  })

  test('redacts tokens in the message and user info', () => {
    const error = Object.assign(new Error(`bad ${TOKEN}`), {
      userInfo: { access_token: TOKEN, reason: `token=${TOKEN}` },
    })
    expect(JSON.stringify(describeErrorForTrace(error))).not.toContain(TOKEN)
  })

  test('handles non-errors', () => {
    expect(describeErrorForTrace('boom')).toEqual({ message: 'boom' })
  })
})

describe('describeGraphError', () => {
  test("keeps Facebook's code, subcode, message and fbtrace_id", () => {
    const body = {
      error: {
        message: 'Error validating access token: Session has expired',
        type: 'OAuthException',
        code: 190,
        error_subcode: 463,
        fbtrace_id: 'AbCdEf123',
      },
    }
    expect(describeGraphError(400, body)).toEqual({
      status: 400,
      code: 190,
      subcode: 463,
      type: 'OAuthException',
      message: 'Error validating access token: Session has expired',
      fbtraceId: 'AbCdEf123',
    })
  })

  test('keeps a sanitised body when there is no error object', () => {
    expect(describeGraphError(502, { data: [{ access_token: TOKEN }] })).toEqual({
      status: 502,
      body: { data: [{}] },
    })
  })
})

describe('describeApiError', () => {
  test('reads the backend error code and message', () => {
    const error = {
      status: 409,
      value: { error: { code: 'FACEBOOK_PAGE_ALREADY_LINKED', message: 'Already linked' } },
    }
    expect(describeApiError(error)).toEqual({
      status: 409,
      code: 'FACEBOOK_PAGE_ALREADY_LINKED',
      message: 'Already linked',
    })
  })

  test('falls back to the plain error fields', () => {
    expect(describeApiError(new Error('Network request failed'))).toMatchObject({
      message: 'Network request failed',
    })
  })
})

describe('createConnectTrace', () => {
  const clock = () => {
    let now = Date.parse('2026-11-12T03:00:00.000Z')
    return { now: () => now, advance: (ms: number) => (now += ms) }
  }

  test('records timestamped steps and builds the payload', () => {
    const { now, advance } = clock()
    const trace = createConnectTrace({ attemptId: 'K7QX2MABCDEFGHJK', now })
    trace.record('cached_token', { result: 'none' })
    advance(10)
    trace.record('login_start')
    advance(1500)
    trace.record('login_result', { result: 'error', error: { domain: 'com.facebook.sdk.login' } })

    expect(trace.referenceCode).toBe('K7QX2M')
    expect(
      trace.toPayload({
        outcome: 'FAILED',
        context: CONTEXT,
        failedStep: 'login',
        error: { domain: 'com.facebook.sdk.login', code: 'FacebookSDK', message: 'Login Failed' },
      })
    ).toEqual({
      attemptId: 'K7QX2MABCDEFGHJK',
      outcome: 'FAILED',
      startedAt: '2026-11-12T03:00:00.000Z',
      failedStep: 'login',
      error: { domain: 'com.facebook.sdk.login', code: 'FacebookSDK', message: 'Login Failed' },
      context: CONTEXT,
      steps: [
        { at: 0, name: 'cached_token', data: { result: 'none' } },
        { at: 10, name: 'login_start' },
        {
          at: 1510,
          name: 'login_result',
          data: { result: 'error', error: { domain: 'com.facebook.sdk.login' } },
        },
      ],
    })
  })

  test('never carries a token, whatever a step records', () => {
    const trace = createConnectTrace()
    trace.record('graph_accounts', {
      response: { data: [{ id: '1', access_token: TOKEN }] },
      accessToken: TOKEN,
      note: `got ${TOKEN}`,
    })
    const payload = trace.toPayload({
      outcome: 'FAILED',
      context: CONTEXT,
      error: { message: `Invalid OAuth access token ${TOKEN}` },
    })
    expect(JSON.stringify(payload)).not.toContain(TOKEN)
  })

  test('caps the number of steps and says how many were dropped', () => {
    const trace = createConnectTrace()
    for (let i = 0; i < 80; i++) trace.record(`step_${i}`)
    const { steps } = trace.toPayload({ outcome: 'ABANDONED', context: CONTEXT })
    expect(steps).toHaveLength(MAX_TRACE_STEPS)
    expect(steps[0].name).toBe('step_0')
    expect(steps.at(-1)).toMatchObject({ name: 'steps_dropped', data: { droppedSteps: 31 } })
  })

  test('drops step data, oldest first, to stay within the size budget', () => {
    const trace = createConnectTrace()
    for (let i = 0; i < 45; i++) {
      trace.record(`step_${i}`, { pages: Array.from({ length: 20 }, () => 'x'.repeat(400)) })
    }
    const { steps } = trace.toPayload({ outcome: 'ABANDONED', context: CONTEXT })
    expect(JSON.stringify(steps).length).toBeLessThanOrEqual(MAX_TRACE_STEPS_JSON_LENGTH)
    expect(steps[0].data).toEqual({ truncated: true })
    expect(steps).toHaveLength(45)
  })
})

describe('summarizeGraphPermissions', () => {
  test('splits permissions by status', () => {
    const body = {
      data: [
        { permission: 'pages_show_list', status: 'granted' },
        { permission: 'pages_read_engagement', status: 'declined' },
        { permission: 'pages_manage_metadata', status: 'expired' },
        { permission: 'public_profile', status: 'granted' },
      ],
    }
    expect(summarizeGraphPermissions(body)).toEqual({
      granted: ['pages_show_list', 'public_profile'],
      declined: ['pages_read_engagement'],
      expired: ['pages_manage_metadata'],
    })
  })

  test('is empty for an unexpected body', () => {
    expect(summarizeGraphPermissions({ error: {} })).toEqual({
      granted: [],
      declined: [],
      expired: [],
    })
  })
})
