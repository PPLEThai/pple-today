import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H1, H2, H3 } from '@pple-today/ui/typography'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { Link } from 'expo-router'
import {
  ArrowRightIcon,
  CalendarHeartIcon,
  CalendarIcon,
  CircleArrowRightIcon,
  HandshakeIcon,
  TicketIcon,
} from 'lucide-react-native'

import { ActivityCard, EXAMPLE_ACTIVITY } from '@app/components/activity/activity-card'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { useSession } from '@app/libs/auth'

export default function ActivityPage() {
  return (
    <SafeAreaLayout>
      <ScrollView className="flex-1 bg-base-bg-default">
        <View className="flex flex-col p-4 bg-base-bg-white">
          <View className="flex flex-row gap-2 items-center">
            <Icon
              icon={HandshakeIcon}
              size={32}
              strokeWidth={2}
              className="text-base-primary-default"
            />
            <H1 className="text-3xl font-heading-semibold text-base-primary-default">กิจกรรม</H1>
          </View>
          <Text className="font-heading-regular text-base-text-medium">กิจกรรมจากพรรคประชาชน</Text>
        </View>
        <View className="gap-3 py-4">
          <MyActivity />
          <RecentActivity />
        </View>
      </ScrollView>
    </SafeAreaLayout>
  )
}

function MyActivity() {
  const session = useSession()
  // if (!session) {
  //   return null
  // }
  const isLoading = false // TODO: fetch user's activities

  const activity = EXAMPLE_ACTIVITY
  return (
    <View className="px-4">
      <View className="rounded-2xl border border-base-outline-default bg-base-bg-white px-4 py-3 flex flex-col gap-3">
        <View className="flex flex-row gap-2 items-center pt-0.5 pb-2.5 border-b border-base-outline-default w-full">
          <Icon
            icon={TicketIcon}
            size={32}
            className="text-base-primary-default"
            strokeWidth={1.5}
          />
          <H2 className="text-xl font-heading-semibold text-base-text-high">กิจกรรมของฉัน</H2>
        </View>
        {/* TODO  */}
        {isLoading &&
          Array.from({ length: 2 }).map((_, idx) => (
            <View className="flex flex-row items-center gap-3" key={idx}>
              <Skeleton className="w-12 h-12 rounded-lg" />
              <View className="flex flex-col flex-1">
                <Skeleton className="h-[14px] mt-[6px] w-full" />
                <Skeleton className="h-[14px] mt-[6px] w-3/4" />
                <Skeleton className="h-[14px] mt-[6px] w-1/2" />
              </View>
              <View className="size-10 flex items-center justify-center">
                <Skeleton className="size-6" />
              </View>
            </View>
          ))}
        {/* TODO */}
        {Array.from({ length: 2 }).map((_, idx) => (
          <View key={idx} className="flex flex-row items-center gap-3">
            <Image
              source={{ uri: activity.image }}
              className="w-12 h-12 rounded-lg bg-base-bg-default"
            />
            <View className="flex flex-col flex-1">
              <H3 className="text-sm font-heading-medium text-base-text-high line-clamp-2">
                {activity.name}
              </H3>
              <View className="flex flex-row gap-1 items-center">
                <Icon icon={CalendarIcon} size={12} className="text-base-primary-default" />
                <Text className="text-base-primary-default text-xs font-heading-regular flex-1">
                  {dayjs(activity.startAt).isSame(dayjs(activity.endAt), 'day')
                    ? dayjs(activity.startAt).format('dd D MMM BB')
                    : `${dayjs(activity.startAt).format('dd D MMM')} - ${dayjs(activity.endAt).format('D MMM BB')}`}
                </Text>
              </View>
            </View>
            <Link asChild href={`/activities/${activity.id}`}>
              <Button variant="ghost" size="icon" aria-label="ดูกิจกรรม">
                <Icon
                  icon={CircleArrowRightIcon}
                  size={24}
                  strokeWidth={1}
                  className="text-base-text-high"
                />
              </Button>
            </Link>
          </View>
        ))}
        <Link asChild href="/activity/my-activities">
          <Button variant="secondary" size="sm">
            <Text>ดูประวัติกิจกรรม</Text>
          </Button>
        </Link>
      </View>
    </View>
  )
}

function RecentActivity() {
  return (
    <View className="px-4 flex flex-col gap-3">
      <View className="flex flex-row justify-between items-center">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={CalendarHeartIcon} className="size-8 text-base-primary-default" />
          <H2 className="text-2xl text-base-text-high font-heading-semibold">กิจกรรมช่วงนี้</H2>
        </View>
        <Link asChild href="/activity/recent">
          <Button variant="ghost">
            <Text>ดูทั้งหมด</Text>
            <Icon icon={ArrowRightIcon} />
          </Button>
        </Link>
      </View>
      <ActivityCard activity={EXAMPLE_ACTIVITY} />
      <ActivityCard activity={EXAMPLE_ACTIVITY} />
    </View>
  )
}
