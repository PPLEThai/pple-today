import 'dayjs/locale/th'

import { View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { cn } from '@pple-today/ui/lib/utils'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'

import PPLEIcon from '@app/assets/pple-icon.svg'

dayjs.extend(buddhistEra)
dayjs.locale('th')

interface Announcement {
  id: string
  title: string
  topics: string[]
  date: string
}
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'ประชุมเลือกตั้งตัวแทนพรรคประจำ อำเภอ(ตทอ.) ประจำอำเภอเมืองสมุทรปราการ',
    topics: ['#เลือกตั้ง'],
    date: '2023-01-01',
  },
  {
    id: '2',
    title:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe cupiditate excepturi inventore, ipsa ipsam recusandae consequatur amet ab iusto, voluptatum, sapiente officia! Iste maiores voluptates perferendis doloremque. Voluptatum, excepturi accusamus officiis magni doloribus minus nesciunt veritatis exercitationem ab earum soluta enim voluptatem in architecto doloremque minima non vero error aspernatur?',
    topics: ['Topic 2'],
    date: '2023-01-02',
  },
  {
    id: '3',
    title: 'Announcement 3',
    topics: ['Topic 3'],
    date: '2023-01-03',
  },
]

export function AnnouncementSlides() {
  return (
    <Slide count={ANNOUNCEMENTS.length} itemWidth={320} gap={8} paddingHorizontal={16}>
      <SlideScrollView>
        {ANNOUNCEMENTS.map((item) => (
          <SlideItem key={item.id}>
            <AnnouncementCard item={item} />
          </SlideItem>
        ))}
      </SlideScrollView>
      <SlideIndicators />
    </Slide>
  )
}

interface AnnouncementCardProps {
  item: Announcement
  className?: string
}
export function AnnouncementCard(props: AnnouncementCardProps) {
  return (
    <View
      className={cn(
        'w-[320px] h-[120px] border border-base-outline-default bg-base-bg-white rounded-2xl flex flex-row gap-4 items-center px-3 py-4',
        props.className
      )}
    >
      {/* TODO: Logo */}
      <View className="w-[80px] h-[80px] bg-primary-500 rounded-xl flex flex-row items-center justify-center">
        <View className="w-[48px] h-[48px] rounded-full bg-primary-800 flex flex-row items-center justify-center">
          <PPLEIcon width={24} height={20} color="white" />
        </View>
      </View>
      <View className="flex flex-col justify-between flex-1">
        <Text className="text-base-text-high font-anakotmai-medium text-sm line-clamp-3 flex-1">
          {props.item.title}
        </Text>
        <View className="flex flex-row gap-1 justify-between items-center">
          <View className="flex flex-row flex-wrap gap-1">
            {props.item.topics.map((topic, index) => (
              <Badge key={index} variant="secondary">
                <Text>{topic}</Text>
              </Badge>
            ))}
          </View>
          <Text className="font-anakotmai-light text-xs text-base-text-medium">
            {dayjs(props.item.date).format('DD MMM BB')}
          </Text>
        </View>
      </View>
    </View>
  )
}
