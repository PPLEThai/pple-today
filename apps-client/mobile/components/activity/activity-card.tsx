import { View } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { CalendarIcon, MapPinIcon } from 'lucide-react-native'

export interface ActivityCardProps {
  className?: string
  activity: {
    id: string
    user: {
      isRegistered: boolean
    }
    name: string
    location: string
    image: string
    startAt: Date
    endAt: Date
  }
}

export const EXAMPLE_ACTIVITY: ActivityCardProps['activity'] = {
  id: '1',
  user: { isRegistered: false },
  name: 'Knowledge Center ครั้งที่ 1 – “เอาชีวิตรอดอย่างโปร ปฐมพยาบาลช่วยชีวิตปลอดภัย”',
  location: 'อาคารอนาคตใหม่ (หัวหมาก 6)',
  image: 'https://picsum.photos/300?random=0',
  startAt: new Date(),
  endAt: dayjs().add(1, 'day').toDate(),
}

export function ActivityCard({ activity, className }: ActivityCardProps) {
  const router = useRouter()
  return (
    <AnimatedBackgroundPressable
      className={cn(
        'border border-base-outline-default rounded-2xl bg-base-bg-white flex flex-row gap-4 p-2 items-stretch h-[203px]',
        className
      )}
      onPress={() => router.navigate(`/activities/${activity.id}`)}
    >
      <Image className="rounded-xl bg-base-bg-default w-[137px]" source={{ uri: activity.image }} />
      <View className="flex flex-col justify-between gap-2 flex-1">
        <View className="flex flex-col gap-1">
          <View className="flex flex-row gap-1 items-center">
            <Icon icon={CalendarIcon} size={12} className="text-base-primary-default" />
            <Text className="text-base-primary-default text-xs font-heading-semibold flex-1">
              {dayjs(activity.startAt).isSame(dayjs(activity.endAt), 'day')
                ? dayjs(activity.startAt).format('dd D MMM BB')
                : `${dayjs(activity.startAt).format('dd D MMM')} - ${dayjs(activity.endAt).format('D MMM BB')}`}
            </Text>
          </View>
          <Text className="line-clamp-4 text-base-text-high text-base font-body-semibold">
            {activity.name}
          </Text>
          <View className="flex flex-row gap-1 items-center">
            <Icon icon={MapPinIcon} size={12} className="text-base-text-medium" />
            <Text className="text-base-text-medium text-xs font-heading-semibold line-clamp-1">
              {activity.location}
            </Text>
          </View>
        </View>
        {activity.user.isRegistered ? (
          <Link asChild href={`/activities/${activity.id}`}>
            <Button size="sm" variant="secondary">
              <Text>ดูรายละเอียด</Text>
            </Button>
          </Link>
        ) : (
          //  TODO: register
          <Button size="sm">
            <Text>ลงทะเบียน</Text>
          </Button>
        )}
      </View>
    </AnimatedBackgroundPressable>
  )
}
