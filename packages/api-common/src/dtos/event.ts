import { Static, t } from 'elysia'

export const Event = t.Object({
  id: t.String(),
  name: t.String(),
  location: t.String(),
  startAt: t.Date(),
  endAt: t.Date(),
  image: t.String(),
  url: t.String(),
})
export type Event = Static<typeof Event>
