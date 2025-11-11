import React from 'react'
import { FlatList, View } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { BellIcon } from 'lucide-react-native'

import { ListHistoryNotificationResponse } from '@api/backoffice/app'
import { PageHeader } from '@app/components/page-header'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'

export default function NotificationHistoryPage() {
  return (
    <View className="flex-1 bg-base-bg-light flex flex-col">
      <PageHeader icon={BellIcon} title="แจ้งเตือน" subtitle="รวมการแจ้งเตือนของคุณ ในที่เดียว" />
      <NotificationHistory />
    </View>
  )
}

function NotificationHistory() {
  const infiniteNotificationsQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/notifications/history'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/notifications/history', {
        query: { limit: 5, cursor: pageParam },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => {
      return lastPage.meta.cursor.next
    },
    select: React.useCallback((data: InfiniteData<ListHistoryNotificationResponse>) => {
      return data.pages.flatMap((page) => page.items)
    }, []),
  })

  const data: ListHistoryNotificationResponse['items'] = React.useMemo(() => {
    return [
      {
        id: '1',
        title: 'การประชุมสรรหาและเลือกตั้งผู้แทนพรรคในเขต\nเลือกตั้งที่ 3',
        message: 'message',
        createdAt: new Date(),
        isRead: false,
        description: 'Description',
        image: undefined,
      },
      {
        id: '2',
        title: 'ข้อมูลการเลือกตั้งเบื้องต้นสำหรับสมาชิกพรรคทั่วประเทศ',
        message: 'message',
        createdAt: new Date(),
        isRead: false,
        description: 'Description',
        image: undefined,
      },
    ]
    return infiniteNotificationsQuery.data ?? []
  }, [infiniteNotificationsQuery.data])

  const onEndReached = React.useCallback(() => {
    if (!infiniteNotificationsQuery.isFetching && infiniteNotificationsQuery.hasNextPage) {
      infiniteNotificationsQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    infiniteNotificationsQuery.isFetching,
    infiniteNotificationsQuery.hasNextPage,
    infiniteNotificationsQuery.fetchNextPage,
  ])

  const Footer =
    infiniteNotificationsQuery.hasNextPage ||
    infiniteNotificationsQuery.isLoading ||
    infiniteNotificationsQuery.error ? (
      <NotificationSkeleton />
    ) : data?.length === 0 ? (
      // Empty State
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีการแจ้งเตือน</Text>
      </View>
    ) : null // Reach end of feed

  const renderItem = React.useCallback(
    ({
      item,
      index,
    }: {
      item: ListHistoryNotificationResponse['items'][number]
      index: number
    }) => {
      return <NotificationItem item={item} key={index} />
    },
    []
  )

  return (
    <FlatList
      className="flex-1"
      contentContainerClassName="px-[12.5px] pt-3 pb-4 gap-3"
      data={data}
      onEndReachedThreshold={0.8}
      onEndReached={onEndReached}
      ListFooterComponent={Footer}
      renderItem={renderItem}
    />
  )
}

const NotificationItem = ({ item }: { item: ListHistoryNotificationResponse['items'][number] }) => {
  const router = useRouter()
  return (
    <AnimatedBackgroundPressable
      className="flex flex-col gap-2 p-3 bg-base-bg-white rounded-2xl border border-base-outline-default"
      onPress={() => router.navigate(`/notification/${item.id}`)}
    >
      <View className="flex flex-row gap-2 items-center">
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
      <Text className="text-sm text-base-text-high font-heading-medium">{item.title}</Text>
    </AnimatedBackgroundPressable>
  )
}

const NotificationSkeleton = () => {
  return (
    <View className="flex flex-col gap-3">
      <View className="w-full h-[104px] bg-base-bg-default rounded-2xl" />
      <View className="w-full h-[104px] bg-base-bg-default rounded-2xl" />
      <View className="w-full h-[104px] bg-base-bg-default rounded-2xl" />
    </View>
  )
}
