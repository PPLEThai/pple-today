import 'dayjs/locale/th'

import { View } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Badge } from '@pple-today/ui/badge'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'

import PPLEIcon from '@app/assets/pple-icon.svg'

dayjs.extend(buddhistEra)
dayjs.locale('th')

interface AnnouncementCardProps {
  title: string
  hashtags?: string[] // no hashtags for now
  date: string
  className?: string
}
export function AnnouncementCard(props: AnnouncementCardProps) {
  // TODO: click card
  return (
    <AnimatedBackgroundPressable
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
          {props.title}
        </Text>
        <View className="flex flex-row gap-1 justify-between items-center">
          <View className="flex flex-row flex-wrap gap-1">
            {props.hashtags?.map((hashtag, index) => (
              <Badge key={index} variant="secondary">
                <Text>{hashtag}</Text>
              </Badge>
            ))}
          </View>
          <Text className="font-anakotmai-light text-xs text-base-text-medium">
            {dayjs(props.date).format('DD MMM BB')}
          </Text>
        </View>
      </View>
    </AnimatedBackgroundPressable>
  )
}
