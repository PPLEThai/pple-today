import React, { useCallback } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { FlatList, View } from 'react-native'

import { Text } from '@pple-today/ui/text'
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { MegaphoneIcon } from 'lucide-react-native'

import type { GetAnnouncementsResponse } from '@api/backoffice/app'
import { AnnouncementCard } from '@app/components/announcement'
import {
  HeaderGlass,
  PageHeader,
  useHeaderGlass,
  usePageHeaderInset,
} from '@app/components/page-header'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'

export default function AnnouncementListPage() {
  const headerGlass = useHeaderGlass({ padded: true })
  return (
    <View className="flex-1 bg-base-bg-light flex flex-col">
      <PageHeader
        icon={MegaphoneIcon}
        title="ประกาศ"
        subtitle="ประกาศสำคัญจาก พรรคประชาชน"
        glass={headerGlass.glass}
      />
      <AnnouncementList scrollProps={headerGlass.scrollProps} />
    </View>
  )
}

function AnnouncementList(props: { scrollProps: HeaderGlass['scrollProps'] }) {
  const headerInset = usePageHeaderInset()
  const announcementsQuery = reactQueryClient.useQuery('/announcements', {
    query: { limit: 5 },
  })
  const infiniteAnnouncementsQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/announcements'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/announcements', {
        query: { limit: 5, page: pageParam },
      })
      if (response.error) {
        throw response.error
      }
      return response.data as GetAnnouncementsResponse
    },
    select: useCallback((data: InfiniteData<GetAnnouncementsResponse>) => {
      return data.pages.map((page) => page.announcements)
    }, []),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage.announcements.length < 5) {
        return undefined
      }
      return lastPageParam + 1
    },
    initialData: { pageParams: [1], pages: [announcementsQuery.data!] },
  })

  const data = infiniteAnnouncementsQuery.data

  const onEndReached = React.useCallback(() => {
    if (!infiniteAnnouncementsQuery.isFetching && infiniteAnnouncementsQuery.hasNextPage) {
      infiniteAnnouncementsQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    infiniteAnnouncementsQuery.isFetching,
    infiniteAnnouncementsQuery.hasNextPage,
    infiniteAnnouncementsQuery.fetchNextPage,
  ])

  const Footer =
    infiniteAnnouncementsQuery.hasNextPage ||
    infiniteAnnouncementsQuery.isLoading ||
    infiniteAnnouncementsQuery.error ? (
      <AnnouncementSkeleton />
    ) : data.length === 1 && data[0].length === 0 ? (
      // Empty State
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีประกาศ</Text>
      </View>
    ) : null // Reach end of feed

  const router = useRouter()
  const renderItem = useCallback(
    ({
      item: items,
      index: pageIndex,
    }: {
      item: GetAnnouncementsResponse['announcements']
      index: number
    }) => {
      return (
        <Fragment key={pageIndex}>
          {items.map((item) => (
            <AnnouncementCard
              className="w-full mt-3"
              key={item.id}
              onPress={() => router.navigate(`/announcement/${item.id}`)}
              id={item.id}
              feedId={item.id}
              title={item.title}
              date={item.publishedAt.toString()}
              type={item.type}
            />
          ))}
        </Fragment>
      )
    },
    [router]
  )

  return (
    <FlatList
      {...props.scrollProps}
      className="flex-1"
      contentContainerClassName="px-[12.5px] pb-4"
      contentContainerStyle={{ paddingTop: headerInset + 4 }}
      data={infiniteAnnouncementsQuery.data}
      onEndReachedThreshold={0.8}
      onEndReached={onEndReached}
      ListFooterComponent={Footer}
      renderItem={renderItem}
    />
  )
}
const AnnouncementSkeleton = () => {
  return (
    <View className="flex flex-col gap-3 mt-3">
      <View className="w-full h-[120px] bg-base-bg-default rounded-2xl" />
      <View className="w-full h-[120px] bg-base-bg-default rounded-2xl" />
      <View className="w-full h-[120px] bg-base-bg-default rounded-2xl" />
    </View>
  )
}
