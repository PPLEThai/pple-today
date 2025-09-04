import { randomUUID } from 'crypto'
import { Elysia } from 'elysia'

export const RequestIdPlugin = new Elysia({ name: 'RequestIdPlugin' })
  .onRequest(({ request, set }) => {
    const requestId = request.headers.get('x-request-id') || randomUUID()

    set.headers['x-request-id'] = requestId
    request.headers.set('x-request-id', requestId)
  })
  .as('global')
