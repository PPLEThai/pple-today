import React from 'react'
import { FlatList, View } from 'react-native'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import {
  infiniteQueryOptions,
  QueryClient,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { produce } from 'immer'
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

export const infiniteNotificationsQueryOptions = infiniteQueryOptions({
  queryKey: [QUERY_KEY_SYMBOL, 'infinite', '/notifications/history'],
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
  select: (data) => {
    return data.pages.flatMap((page) => page.items)
  },
})

export function optimisticMarkAsRead(queryClient: QueryClient, notificationId: string) {
  queryClient.setQueryData(infiniteNotificationsQueryOptions.queryKey, (oldData) => {
    if (!oldData) return oldData
    return produce(oldData, (draft) => {
      for (const page of draft.pages) {
        for (const notification of page.items) {
          if (notification.id === notificationId) {
            notification.isRead = true
            return
          }
        }
      }
    })
  })
  queryClient.setQueryData(
    reactQueryClient.getQueryKey('/notifications/unread-count'),
    (oldData) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        unreadCount: Math.max(0, oldData.unreadCount - 1),
      }
    }
  )
}

export function optimisticMarkAllAsRead(queryClient: QueryClient) {
  queryClient.setQueryData(infiniteNotificationsQueryOptions.queryKey, (oldData) => {
    if (!oldData) return oldData
    return produce(oldData, (draft) => {
      for (const page of draft.pages) {
        for (const notification of page.items) {
          notification.isRead = true
        }
      }
    })
  })
  queryClient.setQueryData(
    reactQueryClient.getQueryKey('/notifications/unread-count'),
    (oldData) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        unreadCount: 0,
      }
    }
  )
}

function NotificationHistory() {
  const infiniteNotificationsQuery = useInfiniteQuery(infiniteNotificationsQueryOptions)

  const data: ListHistoryNotificationResponse['items'] = React.useMemo(() => {
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
  const markAsReadMutation = reactQueryClient.useMutation('put', '/notifications/read/:id', {})
  const queryClient = useQueryClient()
  return (
    <AnimatedBackgroundPressable
      className="flex flex-col gap-2 p-3 bg-base-bg-white rounded-2xl border border-base-outline-default"
      onPress={() => {
        router.navigate(`/notification/${item.id}`)
        if (!item.isRead) {
          optimisticMarkAsRead(queryClient, item.id)
          markAsReadMutation.mutateAsync({ pathParams: { id: item.id } })
        }
      }}
    >
      <View className="flex flex-row gap-2 items-center">
        <View
          className={clsx(
            'size-8 rounded-full flex items-center justify-center',
            item.isRead ? 'bg-base-bg-dark' : 'bg-base-primary-default'
          )}
        >
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
