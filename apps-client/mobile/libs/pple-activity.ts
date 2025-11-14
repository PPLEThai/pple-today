import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import dayjs from 'dayjs'
import { z } from 'zod/v4'

export const GetPPLEActivitySchema = z.object({
  data: z.object({
    date: z.string().pipe(z.iso.date()),
    limit: z.number(),
    total_items: z.number(),
    current_page: z.number(),
    last_pages: z.number(),
    is_lastpage: z.boolean(),
  }),
  result: z.array(
    z.object({
      event_data: z.object({
        ID: z.number(),
        title: z.string(),
        url: z.url(),
        image: z.url(),
        event_date: z.string().pipe(z.iso.date()),
        is_upcoming: z.boolean().optional(), // This field is missing in getUpcomingActivity
        province: z.string(),
        event_type: z.string(),
        event_detail: z.object({
          time_start: z.string().pipe(z.iso.time()).nullable(),
          time_end: z.string().pipe(z.iso.time()).nullable(),
          date: z.string().pipe(z.iso.date()),
          venue: z.string(),
        }),
      }),
    })
  ),
})
export type GetPPLEActivity = z.infer<typeof GetPPLEActivitySchema>

export async function getPPLEActivity({
  limit,
  currentPage,
  is_upcoming = true,
}: { limit?: number; currentPage?: number; is_upcoming?: boolean } = {}) {
  const params = new URLSearchParams({
    ...(limit ? { limit: limit.toString() } : {}),
    ...(currentPage ? { current_page: currentPage.toString() } : {}),
  })
  const response = await fetch(
    `https://act.pplethai.org/external-api/get-last-event/?${params.toString()}`
  )
  if (!response.ok) {
    throw response
  }
  const json = await response.json()
  const data = await GetPPLEActivitySchema.parseAsync(json)
  return {
    ...data,
    result: data.result.filter((item) => item.event_data.is_upcoming === is_upcoming),
  }
}

export async function getTodayActivity({
  limit,
  currentPage,
}: { limit?: number; currentPage?: number } = {}) {
  const params = new URLSearchParams({
    ...(limit ? { limit: limit.toString() } : {}),
    ...(currentPage ? { current_page: currentPage.toString() } : {}),
  })
  const response = await fetch(
    `https://act.pplethai.org/external-api/get-last-event-today/?${params.toString()}`
  )
  if (!response.ok) {
    throw response
  }
  const json = await response.json()
  const data = await GetPPLEActivitySchema.parseAsync(json)
  return {
    ...data,
    result: data.result,
  }
}

export async function getUpcomingActivity({
  limit,
  currentPage,
}: { limit?: number; currentPage?: number } = {}) {
  const params = new URLSearchParams({
    ...(limit ? { limit: limit.toString() } : {}),
    ...(currentPage ? { current_page: currentPage.toString() } : {}),
  })
  const response = await fetch(
    `https://act.pplethai.org/external-api/get-last-event-upcoming/?${params.toString()}`
  )
  if (!response.ok) {
    throw response
  }
  const json = await response.json()
  const data = await GetPPLEActivitySchema.parseAsync(json)
  return {
    ...data,
    result: data.result,
  }
}

export const useRecentActivityQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'get', '/recent-activity'],
  fetcher: ({ limit, currentPage }: { limit: number; currentPage?: number }) => {
    return getPPLEActivity({ limit, currentPage })
  },
})

export interface Activity {
  id: string
  name: string
  location: string
  image: string
  startAt: Date
  endAt: Date
  url: string
}

export const EXAMPLE_ACTIVITY: Activity = {
  id: '1',
  name: 'Knowledge Center ครั้งที่ 1 – “เอาชีวิตรอดอย่างโปร ปฐมพยาบาลช่วยชีวิตปลอดภัย”',
  location: 'อาคารอนาคตใหม่ (หัวหมาก 6)',
  image: 'https://picsum.photos/300?random=0',
  startAt: new Date(),
  endAt: dayjs().add(1, 'day').toDate(),
  url: 'https://www.facebook.com/',
}

export function mapToActivity(data: GetPPLEActivity['result'][number]): Activity {
  return {
    id: data.event_data.ID.toString(),
    name: data.event_data.title,
    location: data.event_data.event_detail.venue,
    startAt: new Date(data.event_data.event_detail.date),
    endAt: new Date(data.event_data.event_detail.date),
    image: data.event_data.image,
    url: data.event_data.url,
  }
}
