import dayjs from 'dayjs'

import { PPLEActivity } from '@api/backoffice/app'

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

export function mapToActivity(data: PPLEActivity['result'][number]): Activity {
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
