import { InternalErrorCode } from '@pple-today/api-common/dtos'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

// The answer route lives in the notification controller, whose plugins pull in
// config, Prisma and OIDC. Those are replaced with decorators over mocks, so the
// real route (header parsing, credential choice, error mapping, both mount
// points) is what runs.
const mocks = vi.hoisted(() => ({
  respond: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('./services', async () => {
  const { Elysia } = await import('elysia')
  const plugin = (name: string, decorations: Record<string, unknown>) =>
    new Elysia({ name }).decorate(decorations as never)
  return {
    NotificationServicePlugin: plugin('test-notification-service', { notificationService: {} }),
    AppNotificationServicePlugin: plugin('test-app-notification-service', {
      appNotificationService: {},
    }),
    InteractionServicePlugin: plugin('test-interaction-service', {
      interactionService: { respond: mocks.respond },
    }),
  }
})
vi.mock('../../plugins/auth-guard', async () => {
  const { Elysia } = await import('elysia')
  return {
    AuthGuardPlugin: new Elysia({ name: 'test-auth-guard' }).decorate({
      authGuard: { getCurrentUser: mocks.getCurrentUser },
    } as never),
  }
})

const INTERACTION = {
  v: 1,
  fields: [],
  actions: [{ id: 'approve', label: 'Approve', style: 'primary' }],
  state: 'RESPONDED',
  response: { actionId: 'approve', respondedAt: new Date('2026-11-10T00:00:00Z') },
}

let app: { handle: (request: Request) => Promise<Response> }
beforeAll(async () => {
  const { NotificationController } = await import('./index')
  app = new Elysia().use(NotificationController as never)
})

const post = (path: string, headers: Record<string, string> = {}) =>
  app.handle(
    new Request(`http://localhost/notifications/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ actionId: 'approve' }),
    })
  )

describe.each(['response', 'answer'])('POST /notifications/:id/%s', (suffix) => {
  const path = `n-1/${suffix}`

  beforeEach(() => {
    mocks.respond.mockReset().mockResolvedValue(ok({ interaction: INTERACTION }))
    mocks.getCurrentUser.mockReset().mockResolvedValue(ok({ id: 'user-1' }))
  })

  test('is mounted', async () => {
    const res = await post(path, { authorization: 'Bearer s' })
    expect(res.status).toBe(200)
  })

  test('both credentials is a 400 and reaches no service', async () => {
    const res = await post(path, {
      authorization: 'Bearer s',
      'x-notification-response-token': 'v1.a.b',
    })

    expect(res.status).toBe(400)
    expect(mocks.respond).not.toHaveBeenCalled()
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
  })

  test('a token and no session reaches the service as a token credential', async () => {
    const res = await post(path, { 'x-notification-response-token': 'v1.a.b' })

    expect(res.status).toBe(200)
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
    expect(mocks.respond).toHaveBeenCalledWith(
      'n-1',
      { kind: 'token', token: 'v1.a.b' },
      { actionId: 'approve' }
    )
  })

  test('a session alone reaches the service as that user', async () => {
    const res = await post(path, { authorization: 'Bearer s' })

    expect(res.status).toBe(200)
    expect(mocks.respond).toHaveBeenCalledWith(
      'n-1',
      { kind: 'session', userId: 'user-1' },
      { actionId: 'approve' }
    )
  })

  test('neither credential is refused without calling the service', async () => {
    mocks.getCurrentUser.mockResolvedValue(
      err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })
    )

    const res = await post(path)

    expect(res.status).toBe(401)
    expect(mocks.respond).not.toHaveBeenCalled()
  })

  test('a token the service rejects is a 401 with its code', async () => {
    mocks.respond.mockResolvedValue(
      err({
        code: InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID,
        message: 'The response token is invalid or has expired',
      })
    )

    const res = await post(path, { 'x-notification-response-token': 'v1.a.b' })

    expect(res.status).toBe(401)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID
    )
  })
})
