import React from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, UserIcon } from 'lucide-react-native'

import { GetFeedItemsByUserIdResponse } from '@api/backoffice/app'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { FeedFooter, FeedRefreshControl } from '@app/components/feed'
import { FeedCard } from '@app/components/feed/feed-card'
import { useUserFollowState } from '@app/components/feed/user-card'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { renderCount } from '@app/utils/count'

const LIMIT = 10
export default function ProfilePage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const queryClient = useQueryClient()
  const userId = params.userId as string
  React.useEffect(() => {
    if (!userId) {
      router.dismissTo('/')
    }
  }, [userId, router])

  const [isFollowing, setIsFollowing] = useUserFollowState(userId, false)

  const followMutation = reactQueryClient.useMutation('post', '/profile/:id/follow', {})
  const unfollowMutation = reactQueryClient.useMutation('delete', '/profile/:id/follow', {})

  const toggleFollow = async () => {
    setIsFollowing(!isFollowing) // optimistic update
    if (isFollowing) {
      await unfollowMutation.mutateAsync({ pathParams: { id: userId } })
      return
    } else {
      await followMutation.mutateAsync({ pathParams: { id: userId } })
    }
  }

  const userDetailsQuery = reactQueryClient.useQuery('/profile/:id', {
    pathParams: { id: userId },
  })

  const userFeedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/users/:id', {
      pathParams: { id: userId! },
    }),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/users/:id', {
        params: { id: userId! },
        query: { page: pageParam, limit: LIMIT },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage && lastPage.length === 0) {
        return undefined
      }
      if (lastPage.length < LIMIT) {
        return undefined
      }
      return lastPageParam + 1
    },
    enabled: !!userId,
  })
  React.useEffect(() => {
    if (userFeedInfiniteQuery.error) {
      console.error('Error fetching feed:', JSON.stringify(userFeedInfiniteQuery.error))
    }
  }, [userFeedInfiniteQuery.error])

  const onEndReached = React.useCallback(() => {
    if (!userFeedInfiniteQuery.isFetching && userFeedInfiniteQuery.hasNextPage) {
      userFeedInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userFeedInfiniteQuery.isFetching,
    userFeedInfiniteQuery.hasNextPage,
    userFeedInfiniteQuery.fetchNextPage,
  ])

  const onRefresh = React.useCallback(async () => {
    await Promise.resolve([
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/profile/:id', { pathParams: { id: userId! } }),
      }),
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/feed/users/:id', { pathParams: { id: userId! } }),
      }),
    ])
    await userFeedInfiniteQuery.refetch()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, userFeedInfiniteQuery.refetch])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetFeedItemsByUserIdResponse[number]; index: number }) => {
      return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-3" />
    },
    []
  )

  const scrollY = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
    },
  })

  const data = React.useMemo((): GetFeedItemsByUserIdResponse => {
    if (!userFeedInfiniteQuery.data) return []
    return userFeedInfiniteQuery.data.pages.flatMap((page) => page)
  }, [userFeedInfiniteQuery.data])

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="bg-base-bg-white">
        <View className="pt-safe-offset-4 px-4 pb-4">
          <Button
            variant="outline-primary"
            size="icon"
            onPress={() => router.back()}
            aria-label="กลับ"
          >
            <Icon icon={ArrowLeftIcon} size={24} />
          </Button>
        </View>
        {userDetailsQuery.isLoading ? (
          <ProfileSectionSkeleton />
        ) : !userDetailsQuery.data ? null : (
          // Profile Section
          <View className="w-full flex flex-col">
            <View className="flex flex-row items-center gap-4 px-4 pb-4">
              {/* Avatar */}
              <Avatar alt={userDetailsQuery.data.name} className="w-16 h-16">
                <AvatarImage source={{ uri: userDetailsQuery.data.profileImage }} />
                <AvatarPPLEFallback />
              </Avatar>
              {/* Name and Location */}
              <View className="flex-1 gap-2">
                <Text className="text-base-text-default text-2xl font-heading-semibold">
                  {userDetailsQuery.data.name}
                </Text>
                <View className="flex flex-row items-center gap-3">
                  <Badge>
                    <Text className="text-xs font-heading-semibold">
                      {userDetailsQuery.data.roles[0] || 'สมาชิก'}
                    </Text>
                  </Badge>
                  <View className="flex flex-row gap-0.5 items-center">
                    <Icon
                      icon={UserIcon}
                      size={20}
                      className="text-base-primary-default"
                      strokeWidth={1.5}
                    />
                    <Text className="text-sm font-heading-semibold text-base-text-medium">
                      {renderCount(userDetailsQuery.data.numberOfFollowers)} คน
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Following Button */}
            <Button
              variant={isFollowing ? 'outline-primary' : 'primary'}
              size="sm"
              onPress={toggleFollow}
              className="mx-4 mb-4"
            >
              <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
            </Button>
          </View>
        )}
      </View>
      <Animated.FlatList
        onScroll={scrollHandler}
        refreshControl={<FeedRefreshControl headerHeight={16} onRefresh={onRefresh} />}
        data={data}
        contentContainerClassName="bg-base-bg-default"
        renderItem={renderFeedItem}
        ListFooterComponent={
          <FeedFooter queryResult={userFeedInfiniteQuery} className="mt-4 mx-3" />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const ProfileSectionSkeleton = () => {
  return (
    <View className="w-full flex flex-col">
      <View className="flex flex-row items-center gap-4 px-4 pb-4">
        {/* Avatar */}
        <Skeleton className="h-16 w-16 rounded-full" />
        {/* Name and Location */}
        <View className="gap-2 w-full flex-1">
          <Skeleton className="h-8 w-2/3" />
          <View className="flex flex-row items-center gap-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </View>
        </View>
      </View>
      <Skeleton className="h-9 mx-4 mb-4" />
    </View>
  )
}
