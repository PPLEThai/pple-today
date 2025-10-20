import { Static, t } from 'elysia'

export const MiniApp = t.Object({
  id: t.String({ description: 'ID of the mini app' }),
  name: t.String({ description: 'Name of the mini app' }),
  iconUrl: t.Nullable(
    t.String({
      description: 'Icon URL of the mini app',
    })
  ),
  url: t.String({
    description: 'Client URL of the mini app',
    format: 'uri',
  }),
  clientId: t.String({ description: 'Client ID of the mini app' }),
  order: t.Number({ description: 'Order of the mini app' }),
})
export type MiniApp = Static<typeof MiniApp>
