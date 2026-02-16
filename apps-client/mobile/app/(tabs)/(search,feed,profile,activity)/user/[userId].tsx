import React from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H3 } from '@pple-today/ui/typography'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, ArrowRightIcon, MegaphoneIcon, UserIcon } from 'lucide-react-native'

import { GetFeedItemsByUserIdResponse } from '@api/backoffice/app'
import { AnnouncementCard, AnnouncementCardSkeleton } from '@app/components/announcement'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { FeedFooter, FeedRefreshControl } from '@app/components/feed'
import { FeedCard } from '@app/components/feed/feed-card'
import { useUserFollow } from '@app/components/feed/user-card'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useAuthMe } from '@app/libs/auth'
import { renderCount } from '@app/utils/count'
import { getRoleName } from '@app/utils/get-role-name'
import { createImageUrl } from '@app/utils/image'

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

  const { isFollowing, toggleFollow } = useUserFollow(userId, false)

  const authMe = useAuthMe()
  const userDetailsQuery = reactQueryClient.useQuery('/profile/:id', {
    pathParams: { id: userId },
  })

  const userFeedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/author/:id', {
      pathParams: { id: userId! },
    }),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/author/:id', {
        params: { id: userId! },
        query: { cursor: pageParam, limit: LIMIT },
        headers: {},
        body: {},
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.cursor.next === null) {
        return undefined
      }
      return lastPage.meta.cursor.next
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
    if (userDetailsQuery.data?.roles[0] === 'official') {
      await Promise.resolve([
        queryClient.resetQueries({
          queryKey: reactQueryClient.getQueryKey('/profile/:id', { pathParams: { id: userId! } }),
        }),
        queryClient.resetQueries({
          queryKey: reactQueryClient.getQueryKey('/feed/author/:id', {
            pathParams: { id: userId! },
          }),
        }),
        queryClient.resetQueries({
          queryKey: reactQueryClient.getQueryKey('/announcements'),
        }),
      ])
    } else {
      await Promise.resolve([
        queryClient.resetQueries({
          queryKey: reactQueryClient.getQueryKey('/profile/:id', { pathParams: { id: userId! } }),
        }),
        queryClient.resetQueries({
          queryKey: reactQueryClient.getQueryKey('/feed/author/:id', {
            pathParams: { id: userId! },
          }),
        }),
      ])
    }

    await userFeedInfiniteQuery.refetch()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, userFeedInfiniteQuery.refetch])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetFeedItemsByUserIdResponse['items'][number]; index: number }) => {
      return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-3" />
    },
    []
  )

  const data = React.useMemo((): GetFeedItemsByUserIdResponse['items'] => {
    if (!userFeedInfiniteQuery.data) return []
    return userFeedInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [userFeedInfiniteQuery.data])

  const renderProfileSection = () => {
    if (userDetailsQuery.isLoading || !userDetailsQuery.data) {
      return <ProfileSectionSkeleton />
    }

    return (
      <View className="w-full flex flex-col bg-base-bg-white">
        <View className="flex flex-row items-center gap-4 px-4 pb-4">
          <Avatar alt={userDetailsQuery.data.name} className="w-16 h-16">
            <AvatarImage
              source={{
                uri: userDetailsQuery.data.profileImage
                  ? createImageUrl(userDetailsQuery.data.profileImage, { width: 64, height: 64 })
                  : undefined,
              }}
            />
            <AvatarPPLEFallback />
          </Avatar>
          <View className="flex-1 gap-2">
            <Text className="text-base-text-high text-2xl font-heading-semibold line-clamp-2">
              {userDetailsQuery.data.name}
            </Text>
            <View className="flex flex-row items-center gap-3">
              <Badge>
                <Text className="text-xs font-heading-semibold">
                  {getRoleName(userDetailsQuery.data.roles)}
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
        {userDetailsQuery.data.id !== authMe.data?.id && (
          <Button
            variant={isFollowing ? 'outline-primary' : 'primary'}
            size="sm"
            disabled={authMe.data?.isSuspended}
            onPress={toggleFollow}
            className="mx-4 mb-4"
          >
            <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
          </Button>
        )}
      </View>
    )
  }

  return (
    <SafeAreaLayout>
      <View className="flex flex-col bg-base-bg-white p-4">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="กลับ"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      <Animated.FlatList
        refreshControl={<FeedRefreshControl headerHeight={0} onRefresh={onRefresh} />}
        data={data}
        renderItem={renderFeedItem}
        className="flex-1"
        contentContainerClassName="pb-4 bg-base-bg-default flex-grow"
        ListHeaderComponent={
          <>
            {renderProfileSection()}
            {userDetailsQuery.data?.roles[0] === 'official' ? <AnnouncementSection /> : undefined}
          </>
        }
        ListFooterComponent={
          <FeedFooter queryResult={userFeedInfiniteQuery} className="mt-4 mx-3" />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaLayout>
  )
}

function AnnouncementSection() {
  const announcementsQuery = reactQueryClient.useQuery('/announcements', {
    query: { limit: 5 },
  })
  const router = useRouter()

  if (announcementsQuery.isLoading) {
    return (
      <View className="flex flex-col">
        <View className="flex flex-row pt-4 px-4 pb-3 justify-between">
          <View className="flex flex-row items-center gap-2">
            <Icon
              icon={MegaphoneIcon}
              className="color-base-primary-default"
              width={32}
              height={32}
            />
            <H3 className="text-base-text-high font-heading-semibold text-2xl">ประกาศ</H3>
          </View>
          <View className="min-h-10 bg-base-bg-default rounded-lg" />
        </View>
        <Slide count={3} itemWidth={320} gap={8} paddingHorizontal={16}>
          <SlideScrollView>
            <SlideItem>
              <AnnouncementCardSkeleton />
            </SlideItem>
            <SlideItem>
              <AnnouncementCardSkeleton />
            </SlideItem>
            <SlideItem>
              <AnnouncementCardSkeleton />
            </SlideItem>
          </SlideScrollView>
          <SlideIndicators />
        </Slide>
      </View>
    )
  }

  if (!announcementsQuery.data) return null
  const announcements = announcementsQuery.data.announcements
  if (announcements.length === 0) return null
  return (
    <View className="flex flex-col">
      <View className="flex flex-row pt-4 px-4 pb-3 justify-between">
        <View className="flex flex-row items-center gap-2">
          <Icon
            icon={MegaphoneIcon}
            className="color-base-primary-default"
            width={32}
            height={32}
          />
          <H3 className="text-base-text-high font-heading-semibold text-2xl">ประกาศ</H3>
        </View>
        <Button variant="ghost" onPress={() => router.navigate('/announcement')}>
          <Text>ดูเพิ่มเติม</Text>
          <Icon icon={ArrowRightIcon} strokeWidth={2} />
        </Button>
      </View>
      <Slide count={announcements.length} itemWidth={320} gap={8} paddingHorizontal={16}>
        <SlideScrollView>
          {announcements.map((announcement) => (
            <SlideItem key={announcement.id}>
              <AnnouncementCard
                id={announcement.id}
                onPress={() => router.navigate(`/feed/${announcement.id}`)}
                feedId={announcement.id}
                title={announcement.title}
                date={announcement.publishedAt.toString()}
                type={announcement.type}
              />
            </SlideItem>
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}

const ProfileSectionSkeleton = () => {
  return (
    <View className="w-full flex flex-col bg-base-bg-white">
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
