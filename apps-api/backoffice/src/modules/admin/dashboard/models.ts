import { Static, t } from 'elysia'

export const GetDashboardInfoResponse = t.Object({
  users: t.Object({
    today: t.Number({ description: 'Total user (only) today' }),
    yesterday: t.Number({ description: 'Total user (only) yesterday' }),
    previousYesterday: t.Number({ description: 'Total user previously to yesterday' }),
  }),
  members: t.Object({
    today: t.Number({ description: 'Total member (only) today' }),
    yesterday: t.Number({ description: 'Total member (only) yesterday' }),
    previousYesterday: t.Number({ description: 'Total member previously to yesterday' }),
  }),
  posts: t.Object({
    today: t.Number({ description: 'Total post (only) today' }),
    yesterday: t.Number({ description: 'Total post (only) yesterday' }),
  }),
  comments: t.Object({
    today: t.Number({ description: 'Total comment (only) today' }),
    yesterday: t.Number({ description: 'Total comment (only) yesterday' }),
  }),
  likes: t.Object({
    today: t.Number({ description: 'Total like (only) today' }),
    yesterday: t.Number({ description: 'Total like (only) yesterday' }),
  }),
  userPerProvince: t.Record(
    t.String({ description: 'Province' }),
    t.Number({ description: 'User count in that province' })
  ),
  memberPerProvince: t.Record(
    t.String({ description: 'Province' }),
    t.Number({ description: 'Member count in that province' })
  ),
})
export type GetDashboardInfoResponse = Static<typeof GetDashboardInfoResponse>
