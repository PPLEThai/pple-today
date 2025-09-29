import 'dayjs/locale/th'

import { View } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Badge } from '@pple-today/ui/badge'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import { LandmarkIcon } from 'lucide-react-native'

import { GetAnnouncementsResponse } from '@api/backoffice/app'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

dayjs.extend(buddhistEra)
dayjs.locale('th')

type AnnouncementType = GetAnnouncementsResponse['announcements'][number]['type']

interface AnnouncementCardProps {
  id: string
  feedId: string
  title: string
  type: AnnouncementType
  hashtags?: string[] // no hashtags for now
  date: string
  className?: string
  onPress?: () => void
}

export function AnnouncementCard(props: AnnouncementCardProps) {
  const getLogo = (type: AnnouncementType) => {
    switch (type) {
      case 'OFFICIAL':
        return {
          borderColor: 'border-rose-700',
          background: 'bg-rose-500',
          logoBackground: 'bg-rose-800',
          Logo: <Icon icon={LandmarkIcon} size={24} color="white" />,
        }
      case 'PARTY_COMMUNICATE':
        return {
          borderColor: 'border-base-primary-dark',
          background: 'bg-primary-500',
          logoBackground: 'bg-primary-800',
          Logo: <PPLEIcon width={24} height={20} color="white" />,
        }
      case 'INTERNAL':
        return {
          borderColor: 'border-base-outline-default',
          background: 'bg-base-bg-white',
          logoBackground: 'bg-base-secondary-default',
          Logo: <PPLEIcon width={24} height={20} />,
        }
      default:
        exhaustiveGuard(type)
    }
  }

  const { borderColor, logoBackground, background, Logo } = getLogo(props.type)

  return (
    <AnimatedBackgroundPressable
      className={cn(
        'w-[320px] h-[120px] border border-base-outline-default bg-base-bg-white rounded-2xl flex flex-row gap-4 items-center px-3 py-4',
        props.className
      )}
      onPress={props.onPress}
    >
      <View
        className={cn(
          'w-[80px] h-[80px] bg-primary-500 rounded-xl flex flex-row items-center justify-center border-2',
          background,
          borderColor
        )}
      >
        <View
          className={cn(
            'w-[48px] h-[48px] rounded-full bg-primary-800 flex flex-row items-center justify-center',
            logoBackground
          )}
        >
          {Logo}
        </View>
      </View>
      <View className="flex flex-col justify-between flex-1">
        <Text className="text-base-text-high font-heading-semibold text-sm line-clamp-3 flex-1">
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
          <Text className="font-heading-regular text-xs text-base-text-medium">
            {dayjs(props.date).format('DD MMM BB')}
          </Text>
        </View>
      </View>
    </AnimatedBackgroundPressable>
  )
}

interface AnnouncementCardSkeletonProps {
  className?: string
}

export function AnnouncementCardSkeleton(props: AnnouncementCardSkeletonProps) {
  return (
    <View
      className={cn(
        'w-[320px] h-[120px] bg-base-bg-white rounded-2xl flex flex-row gap-4 items-center px-3 py-4',
        props.className
      )}
    >
      <Skeleton className="w-[80px] h-[80px] rounded-xl flex flex-row items-center justify-center" />
      <View className="flex flex-col justify-between flex-1 h-full">
        <Skeleton className="h-8 mb-1" />
        <View className="flex flex-row gap-1 justify-end items-center">
          <Skeleton className="w-24 h-5" />
        </View>
      </View>
    </View>
  )
}
