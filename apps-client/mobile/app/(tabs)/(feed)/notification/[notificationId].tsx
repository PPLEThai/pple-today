import React, { useEffect } from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import dayjs from 'dayjs'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, ArrowUpRightIcon, BellIcon } from 'lucide-react-native'

import { reactQueryClient } from '@app/libs/api-client'
import { openLink } from '@app/utils/link'

export default function NotificationDetailPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const notificationId = params.notificationId as string
  useEffect(() => {
    if (!notificationId) {
      router.dismissTo('/')
    }
  }, [notificationId, router])
  const notificationDetailQuery = reactQueryClient.useQuery('/notifications/:id', {
    pathParams: { id: notificationId! },
    enabled: !!notificationId,
  })
  useEffect(() => {
    if (notificationDetailQuery.error) {
      console.error(
        'Error fetching notification detail:',
        JSON.stringify(notificationDetailQuery.error)
      )
      router.dismissTo('/notification')
    }
  }, [notificationDetailQuery.error, router])
  const item = notificationDetailQuery.data
  if (!notificationId) {
    return null
  }
  return (
    <View className="flex-1 flex-col">
      <View className="pt-safe-offset-4 pb-2 px-4 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      {
        // notificationDetailQuery.isLoading ||
        !item ? (
          <NotificationDetailSkeleton />
        ) : (
          <>
            <ScrollView
              className="flex-1"
              contentContainerClassName="pt-1 pb-2 bg-base-bg-white flex-grow flex flex-col gap-3 px-4"
            >
              <View className="flex flex-row items-center gap-2">
                <View className="size-8 rounded-full bg-base-primary-default flex items-center justify-center">
                  <Icon icon={BellIcon} className="text-base-bg-white" />
                </View>
                <Text className="text-sm text-base-text-medium font-heading-medium flex-1">
                  แจ้งเตือนทั่วไป
                </Text>
                <Text className="text-sm text-base-text-medium font-heading-regular">
                  {dayjs(item.createdAt).format('DD MMM BB')}
                </Text>
              </View>
              <H1 className="text-lg font-heading-semibold">{item.content.header}</H1>
              <Text className="text-base-text-medium font-body-regular text-base">
                {item.content.message}
              </Text>
            </ScrollView>
            {item.content.link && (
              <View className="p-4 pb-6 bg-base-bg-white">
                <Button onPress={() => openLink(item.content.link!)}>
                  <Icon icon={ArrowUpRightIcon} />
                  <Text>{item.content.actionButtonText}</Text>
                </Button>
              </View>
            )}
          </>
        )
      }
    </View>
  )
}

function NotificationDetailSkeleton() {
  return (
    <View className="flex-1 pt-1 pb-2 bg-base-bg-white flex-grow flex flex-col gap-3 px-4">
      <View className="flex flex-row items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-[14px] w-20" />
        <View className="flex-1" />
        <Skeleton className="h-[14px] w-20" />
      </View>
      <Skeleton className="w-full h-[18px] mt-[10px]" />
      <View>
        <Skeleton className="w-full h-4 mt-2" />
        <Skeleton className="w-full h-4 mt-2" />
        <Skeleton className="w-1/3 h-4 mt-2" />
      </View>
    </View>
  )
}
