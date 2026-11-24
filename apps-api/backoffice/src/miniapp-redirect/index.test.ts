import Elysia from 'elysia'
import { ok } from 'neverthrow'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getMiniAppByEntry: vi.fn(),
}))

vi.mock('./repository', async () => {
  const { default: Elysia } = await import('elysia')
  return {
    MiniAppRedirectRepositoryPlugin: new Elysia({ name: 'MiniAppRedirectRepository' }).decorate({
      miniAppRedirectRepository: { getMiniAppByEntry: mocks.getMiniAppByEntry },
    }),
  }
})

vi.mock('../plugins/config', async () => {
  const { default: Elysia } = await import('elysia')
  return {
    ConfigServicePlugin: new Elysia({ name: 'ConfigService' }).decorate({
      configService: { get: () => undefined },
    }),
  }
})

let app: { handle: (request: Request) => Promise<Response> }

beforeAll(async () => {
  const { MiniAppRedirectController } = await import('./index')
  app = new Elysia().use(MiniAppRedirectController)
})

const CLIENT_URL = 'https://donate.ppleth.ai'

describe('mini-app redirect host', () => {
  beforeEach(() => {
    mocks.getMiniAppByEntry.mockReset().mockResolvedValue(ok({ clientUrl: CLIENT_URL }))
  })

  test('GET /<linkName>/a/b?x=1 redirects 301 to <clientUrl>/a/b?x=1', async () => {
    const response = await app.handle(
      new Request('https://miniapp.peoplesparty.or.th/donate/a/b?x=1')
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://donate.ppleth.ai/a/b?x=1')
    expect(mocks.getMiniAppByEntry).toHaveBeenCalledWith('donate')
  })

  test('the same request under the slug still redirects', async () => {
    const response = await app.handle(
      new Request('https://miniapp.peoplesparty.or.th/brave-purple-lion/a/b?x=1')
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://donate.ppleth.ai/a/b?x=1')
    expect(mocks.getMiniAppByEntry).toHaveBeenCalledWith('brave-purple-lion')
  })

  test('an unknown entry is 404', async () => {
    mocks.getMiniAppByEntry.mockResolvedValue(ok(null))

    const response = await app.handle(new Request('https://miniapp.peoplesparty.or.th/missing'))

    expect(response.status).toBe(404)
  })
})
