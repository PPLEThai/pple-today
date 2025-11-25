import { Static, t } from 'elysia'

export const PPLETodayActivity = t.Object({
  data: t.Object({
    date: t.String({ format: 'date' }),
    limit: t.Number(),
    total_items: t.Number(),
    current_page: t.Number(),
    last_pages: t.Number(),
    is_lastpage: t.Boolean(),
  }),
  result: t.Array(
    t.Object({
      event_data: t.Object({
        ID: t.Number(),
        title: t.String(),
        url: t.String(),
        image: t.String(),
        event_date: t.String(),
        province: t.String(),
        event_type: t.String(),
        event_detail: t.Object({
          time_start: t.Nullable(t.String()),
          time_end: t.Nullable(t.String()),
          date: t.String(),
          venue: t.String(),
        }),
      }),
    })
  ),
})
export type PPLETodayActivity = Static<typeof PPLETodayActivity>

export const PPLEActivity = t.Object({
  data: t.Object({
    date: t.String(),
    limit: t.Number(),
    total_items: t.Number(),
    current_page: t.Number(),
    last_pages: t.Number(),
    is_lastpage: t.Boolean(),
  }),
  result: t.Array(
    t.Object({
      event_data: t.Object({
        ID: t.Number(),
        title: t.String(),
        url: t.String(),
        image: t.String(),
        event_date: t.String(),
        province: t.String(),
        is_upcoming: t.Boolean(),
        event_type: t.String(),
        event_detail: t.Object({
          time_start: t.Nullable(t.String()),
          time_end: t.Nullable(t.String()),
          date: t.String(),
          venue: t.String(),
        }),
      }),
    })
  ),
})
export type PPLEActivity = Static<typeof PPLEActivity>
