import { InternalErrorCode } from '@pple-today/api-common/dtos'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

// Same approach as respond-controller.test.ts: the plugins that pull in config,
// Prisma and OIDC are replaced with decorators over mocks, so the real route
// (header parsing, body validation, error mapping) is what runs.
const mocks = vi.hoisted(() => ({ registerPushToken: vi.fn() }))

vi.mock('./services', async () => {
  const { Elysia } = await import('elysia')
  const plugin = (name: string, decorations: Record<string, unknown>) =>
    new Elysia({ name }).decorate(decorations as never)
  return {
    NotificationServicePlugin: plugin('test-notification-service', { notificationService: {} }),
    AppNotificationServicePlugin: plugin('test-app-notification-service', {
      appNotificationService: {},
    }),
    InteractionServicePlugin: plugin('test-interaction-service', { interactionService: {} }),
    LiveActivityServicePlugin: plugin('test-live-activity-service', {
      liveActivityService: { registerPushToken: mocks.registerPushToken },
    }),
  }
})
vi.mock('../../plugins/auth-guard', async () => {
  const { Elysia } = await import('elysia')
  return {
    AuthGuardPlugin: new Elysia({ name: 'test-auth-guard' }).decorate({
      authGuard: { getCurrentUser: vi.fn() },
    } as never),
  }
})

let app: { handle: (request: Request) => Promise<Response> }
beforeAll(async () => {
  const { NotificationController } = await import('./index')
  app = new Elysia().use(NotificationController as never)
})

const post = (
  headers: Record<string, string> = {},
  body: unknown = { pushToken: 'aabbcc' },
  id = 'n-1'
) =>
  app.handle(
    new Request(`http://localhost/notifications/${id}/live-activity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  )

describe('POST /notifications/:id/live-activity', () => {
  beforeEach(() => {
    mocks.registerPushToken.mockReset().mockResolvedValue(ok({ state: 'OPEN' }))
  })

  test('a valid token reaches the service and answers the state, with no session', async () => {
    const res = await post({ 'x-notification-response-token': 'v1.a.b' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: 'OPEN' })
    expect(mocks.registerPushToken).toHaveBeenCalledWith('n-1', 'v1.a.b', 'aabbcc')
  })

  test('RESPONDED carries the action label', async () => {
    mocks.registerPushToken.mockResolvedValue(ok({ state: 'RESPONDED', actionLabel: 'อนุมัติ' }))

    const res = await post({ 'x-notification-response-token': 'v1.a.b' })

    expect(await res.json()).toEqual({ state: 'RESPONDED', actionLabel: 'อนุมัติ' })
  })

  test('a token the service rejects is a 401 with its code', async () => {
    mocks.registerPushToken.mockResolvedValue(
      err({
        code: InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID,
        message: 'The response token is invalid or has expired',
      })
    )

    const res = await post({ 'x-notification-response-token': 'v1.a.b' })

    expect(res.status).toBe(401)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID
    )
  })

  test('a missing header is passed on as undefined (the service answers 401)', async () => {
    await post({})

    expect(mocks.registerPushToken).toHaveBeenCalledWith('n-1', undefined, 'aabbcc')
  })

  test.each([['not hex'], ['']])(
    'a bad pushToken %j is refused before the service',
    async (pushToken) => {
      const res = await post({ 'x-notification-response-token': 'v1.a.b' }, { pushToken })

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(mocks.registerPushToken).not.toHaveBeenCalled()
    }
  )

  test('an oversized pushToken is refused', async () => {
    const res = await post(
      { 'x-notification-response-token': 'v1.a.b' },
      { pushToken: 'a'.repeat(513) }
    )

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(mocks.registerPushToken).not.toHaveBeenCalled()
  })
})
