import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { decode } from 'html-entities'
import { CalendarIcon, MapPinIcon } from 'lucide-react-native'

import { Activity } from '@app/libs/pple-activity'
import { createImageUrl } from '@app/utils/image'

export interface ActivityCardProps {
  className?: string
  activity: Activity
}

export function ActivityCard({ activity, className }: ActivityCardProps) {
  const isUserRegistered = false
  return (
    <View
      className={cn(
        'border border-base-outline-default rounded-2xl bg-base-bg-white flex flex-row gap-4 p-2 items-stretch h-[203px]',
        className
      )}
    >
      <Image
        className="rounded-xl bg-base-bg-default w-[137px]"
        source={{
          uri: createImageUrl(activity.image, {
            width: 137,
            height: 203,
          }),
        }}
      />
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
            {decode(activity.name)}
          </Text>
          <View className="flex flex-row gap-1 items-center">
            <Icon icon={MapPinIcon} size={12} className="text-base-text-medium" />
            <Text className="text-base-text-medium text-xs font-heading-semibold line-clamp-1 flex-1">
              {decode(activity.location)}
            </Text>
          </View>
        </View>
        {isUserRegistered ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              WebBrowser.openBrowserAsync(activity.url)
            }}
          >
            <Text>ดูรายละเอียด</Text>
          </Button>
        ) : (
          <Button
            size="sm"
            onPress={() => {
              WebBrowser.openBrowserAsync(activity.url)
            }}
          >
            <Text>ลงทะเบียน</Text>
          </Button>
        )}
      </View>
    </View>
  )
}

export function ActivityCardSkeleton({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'border border-base-outline-default rounded-2xl bg-base-bg-white flex flex-row gap-4 p-2 items-stretch h-[203px]',
        className
      )}
    >
      <Skeleton className="rounded-xl bg-base-bg-default w-[137px]" />
      <View className="flex flex-col justify-between gap-2 flex-1">
        <View className="flex flex-col gap-1">
          <Skeleton className="h-[12px] mt-[4px] w-20 rounded" />
          <Skeleton className="h-[16px] mt-[8px] w-full rounded" />
          <Skeleton className="h-[16px] mt-[8px] w-full rounded" />
          <Skeleton className="h-[16px] mt-[8px] w-1/2 rounded" />
          <Skeleton className="h-[12px] mt-[4px] w-24 rounded" />
        </View>
        <Skeleton className="h-8 w-full rounded-lg" />
      </View>
    </View>
  )
}
