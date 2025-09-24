import React from 'react'
import { FlatList, View } from 'react-native'

import { ExtractBodyResponse } from '@pple-today/api-client'
import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { useInfiniteQuery } from '@tanstack/react-query'
import { EyeOffIcon } from 'lucide-react-native'

import type { ApplicationApiSchema, GetFeedCommentResponse } from '@api/backoffice/app'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { formatDateInterval } from '@app/libs/format-date-interval'

const LIMIT = 10
export function FeedCommentSection({
  feedId,
  headerComponent,
}: {
  feedId: string
  headerComponent?: React.ReactElement
}) {
  const commentInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/:id/comments', { pathParams: { id: feedId! } }),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/:id/comments', {
        params: { id: feedId! },
        query: { cursor: pageParam, limit: LIMIT },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, _, _lastPageParam) => {
      if (!lastPage || lastPage.length === 0 || lastPage.length < LIMIT) {
        return undefined
      }
      return lastPage.at(-1)!.id
    },
    enabled: !!feedId,
  })
  React.useEffect(() => {
    if (commentInfiniteQuery.error) {
      console.error('Error fetching comments:', JSON.stringify(commentInfiniteQuery.error))
    }
  }, [commentInfiniteQuery.error])

  const onEndReached = React.useCallback(() => {
    if (!commentInfiniteQuery.isFetching && commentInfiniteQuery.hasNextPage) {
      commentInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    commentInfiniteQuery.isFetching,
    commentInfiniteQuery.hasNextPage,
    commentInfiniteQuery.fetchNextPage,
  ])

  type GetFeedCommentResponse = ExtractBodyResponse<
    ApplicationApiSchema,
    'get',
    '/feed/:id/comments'
  >
  const data = React.useMemo((): GetFeedCommentResponse[] => {
    if (!commentInfiniteQuery.data) return []
    return commentInfiniteQuery.data.pages.filter((page) => !!page)
  }, [commentInfiniteQuery.data])

  const Footer =
    commentInfiniteQuery.hasNextPage ||
    commentInfiniteQuery.isLoading ||
    commentInfiniteQuery.error ? (
      <FeedCommentSkeleton />
    ) : data.length === 1 && data[0].length === 0 ? (
      // Empty State
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีความคิดเห็น</Text>
      </View>
    ) : null // Reach end of feed

  const renderItem = React.useCallback(
    ({ item: items, index: _pageIndex }: { item: GetFeedCommentResponse; index: number }) => {
      return (
        <>
          {items.map((item) => (
            <FeedComment key={item.id} item={item} />
          ))}
        </>
      )
    },
    []
  )

  return (
    <FlatList
      data={data}
      onEndReached={onEndReached}
      onEndReachedThreshold={1}
      ListHeaderComponent={headerComponent}
      ListHeaderComponentClassName="pb-2"
      ListFooterComponent={Footer}
      contentContainerClassName="pb-2"
      renderItem={renderItem}
    />
  )
}

function FeedComment({ item }: { item: GetFeedCommentResponse[number] }) {
  return (
    <View className="flex flex-row gap-2 mt-3 mx-4">
      {/* TODO: Link */}
      <Avatar alt={item.author.name} className="w-8 h-8">
        <AvatarImage source={{ uri: item.author.profileImage }} />
        <AvatarPPLEFallback />
      </Avatar>
      <View className="flex flex-col gap-1">
        <View
          className={clsx(
            'flex flex-col gap-1 rounded-2xl border px-3 py-2',
            item.isPrivate
              ? 'bg-base-bg-medium border-base-outline-medium'
              : 'bg-base-bg-white border-base-outline-default'
          )}
        >
          <View className="flex flex-row justify-between gap-2 items-center">
            <Text className="font-heading-semibold text-base-text-high text-xs">
              {item.author.name}
            </Text>
            {item.isPrivate && (
              <Icon icon={EyeOffIcon} size={16} className="text-base-secondary-light" />
            )}
          </View>
          <Text className="font-body-light text-base-text-high text-sm">{item.content}</Text>
        </View>
        <Text className="font-heading-regular text-base-text-medium text-xs">
          {formatDateInterval(item.createdAt.toString())}
        </Text>
      </View>
    </View>
  )
}
const FeedCommentSkeleton = () => {
  return (
    <View className="flex flex-col gap-3 mt-3 mx-4">
      <View className="flex flex-row gap-2">
        <View className="w-8 h-8 bg-base-bg-medium rounded-full" />
        <View className="flex flex-col flex-1 gap-1">
          <View className="flex flex-col gap-1 rounded-2xl w-[200px] bg-base-bg-medium h-16" />
          <View className="h-3 mt-1 rounded-full bg-base-bg-medium w-[60px]" />
        </View>
      </View>
      <View className="flex flex-row gap-2">
        <View className="w-8 h-8 bg-base-bg-medium rounded-full" />
        <View className="flex flex-col flex-1 gap-1 w-full">
          <View className="flex flex-col gap-1 rounded-2xl bg-base-bg-medium h-20" />
          <View className="h-3 mt-1 rounded-full bg-base-bg-medium w-[60px]" />
        </View>
      </View>
      <View className="flex flex-row gap-2">
        <View className="w-8 h-8 bg-base-bg-medium rounded-full" />
        <View className="flex flex-col flex-1 gap-1 w-[100px]">
          <View className="flex flex-col gap-1 rounded-2xl w-[160px] bg-base-bg-medium h-12" />
          <View className="h-3 mt-1 rounded-full bg-base-bg-medium w-[60px]" />
        </View>
      </View>
    </View>
  )
}
