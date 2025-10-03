import React from 'react'
import { Keyboard, Pressable, View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { useForm } from '@tanstack/react-form'
import { InfiniteData, useInfiniteQuery, UseInfiniteQueryResult } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, SearchIcon } from 'lucide-react-native'

import { GetTopicFeedResponse } from '@api/backoffice/app'
import { FeedCard, FeedCardSkeleton } from '@app/components/feed/feed-card'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { AnnouncementSearchCard } from '@app/components/search/announcement-card'
import { HashtagSearchCard } from '@app/components/search/hashtag-card'
import { TopicSearchBigCard } from '@app/components/search/topic-card'
import { UserSearchCard } from '@app/components/search/user-card'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'

const LIMIT = 10
export default function SearchResultPage() {
  const searchQuery = useLocalSearchParams()
  const router = useRouter()
  const [reSearchQuery, setReSearchQuery] = React.useState<string>(searchQuery.query as string)
  const searchForm = useForm({
    defaultValues: {
      query: reSearchQuery,
    },
  })

  return (
    <Pressable onPress={Keyboard.dismiss} className="flex-1">
      <SafeAreaLayout>
        <View className="p-4 gap-3">
          {/* Search Header */}
          <View className="flex flex-row items-center gap-2">
            <Icon icon={SearchIcon} size={32} className="text-base-primary-default" />
            <H1 className="text-lg font-semibold text-base-primary-default text-3xl font-heading-semibold">
              ผลการค้นหา
            </H1>
          </View>
          <View className="flex flex-row gap-3 items-center">
            <Button
              variant="outline-primary"
              size="icon"
              onPress={() => router.back()}
              aria-label="Go back"
            >
              <Icon icon={ArrowLeftIcon} size={24} />
            </Button>
            <View className="flex-1">
              <searchForm.Field
                name="query"
                listeners={{
                  onChangeDebounceMs: 500,
                  onChange: ({ value }) => {
                    setReSearchQuery(value)
                  },
                }}
              >
                {(field) => (
                  <FormItem field={field}>
                    <FormControl>
                      <InputGroup>
                        <InputLeftIcon icon={SearchIcon} className="text-base-text-medium" />
                        <Input
                          placeholder="ค้นหา"
                          className="rounded-lg"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          returnKeyType="search"
                          onSubmitEditing={searchForm.handleSubmit}
                        />
                      </InputGroup>
                    </FormControl>
                  </FormItem>
                )}
              </searchForm.Field>
            </View>
          </View>
        </View>
        <SearchResult query={reSearchQuery} />
      </SafeAreaLayout>
    </Pressable>
  )
}

const UserSearchSection = ({ query }: { query: string }) => {
  const userSearchQuery = reactQueryClient.useQuery(
    '/search/details/users',
    {
      query: { search: query },
    },
    { enabled: !!query }
  )

  if (!userSearchQuery.data || userSearchQuery.data.length === 0) {
    return null
  }

  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4">ผู้คน</H2>
      {userSearchQuery.data.map((user) => (
        <UserSearchCard
          key={user.id}
          id={user.id}
          name={user.name}
          profileImage={user.profileImage}
        />
      ))}
    </View>
  )
}

const TopicSearchSection = ({ query }: { query: string }) => {
  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4">หัวข้อ</H2>
      <TopicSearchBigCard
        id="1"
        name={'ภารกิจส้มสู้ไฟ'}
        hashtags={[
          {
            id: '1',
            name: '#pple-today-1',
            status: 'PUBLISH',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]}
      />
      <TopicSearchBigCard
        id="2"
        name={'เดินหน้าประเทศไทย'}
        hashtags={[
          {
            id: '1',
            name: '#pple-today-1',
            status: 'PUBLISH',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            name: '#pple-today-1',
            status: 'PUBLISH',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]}
      />
      <TopicSearchBigCard
        id="3"
        name={'หลบหนีเตาผิง'}
        hashtags={[
          {
            id: '3',
            name: '#pple-today-5',
            status: 'PUBLISH',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '5',
            name: '#pple-today-5',
            status: 'PUBLISH',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '7',
            name: '#pple-today-5',
            status: 'PUBLISH',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]}
      />
    </View>
  )
}

const HashtagSearchSection = ({ query }: { query: string }) => {
  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4"># แฮชแท็ก</H2>
      <HashtagSearchCard id="1" name={'การเมือง'} />
      <HashtagSearchCard id="1" name={'การปกครอง'} />
      <HashtagSearchCard id="1" name={'การเมือง'} />
      <HashtagSearchCard id="1" name={'การปกครอง'} />
    </View>
  )
}

const AnnouncementSearchSection = ({ query }: { query: string }) => {
  const mockAnnouncements = [
    {
      id: '1',
      feedId: 'feed-1',
      title: 'การปิดปรับปรุงระบบ',
      type: 'OFFICIAL' as 'OFFICIAL' | 'PARTY_COMMUNICATE' | 'INTERNAL',
      date: new Date().toISOString(),
    },
    {
      id: '2',
      feedId: 'feed-2',
      title: 'การอัปเดตแอปพลิเคชัน',
      type: 'PARTY_COMMUNICATE' as 'OFFICIAL' | 'PARTY_COMMUNICATE' | 'INTERNAL',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      feedId: 'feed-3',
      title: 'ประกาศกิจกรรมพิเศษ',
      type: 'INTERNAL' as 'OFFICIAL' | 'PARTY_COMMUNICATE' | 'INTERNAL',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4">ประกาศ</H2>
      {mockAnnouncements.map((announcement) => (
        <AnnouncementSearchCard {...announcement} key={announcement.id} />
      ))}
    </View>
  )
}

const SearchResult = ({ query }: { query: string }) => {
  const feedQuery = query
  const insets = useSafeAreaInsets()
  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/search/details/feeds', {
      query: { search: feedQuery },
    }),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/search/details/feeds', {
        query: { limit: LIMIT, search: feedQuery!, cursor: `${pageParam}` },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: '',
    getNextPageParam: (lastPage, _) => {
      if (lastPage && lastPage.length === 0) {
        return undefined
      }
      if (lastPage.length < LIMIT) {
        return undefined
      }
      return lastPage[lastPage.length - 1].id
    },
    enabled: !!feedQuery,
  })
  React.useEffect(() => {
    if (feedInfiniteQuery.error) {
      console.error('Error fetching feed:', JSON.stringify(feedInfiniteQuery.error))
    }
  }, [feedInfiniteQuery.error])

  const onEndReached = React.useCallback(() => {
    if (!feedInfiniteQuery.isFetching && feedInfiniteQuery.hasNextPage) {
      feedInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedInfiniteQuery.isFetching, feedInfiniteQuery.hasNextPage, feedInfiniteQuery.fetchNextPage])

  const data = React.useMemo((): GetTopicFeedResponse => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.flatMap((page) => page)
  }, [feedInfiniteQuery.data])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetTopicFeedResponse[number]; index: number }) => {
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

  return (
    <View className="border-b border-base-outline-default">
      <Animated.FlatList
        onScroll={scrollHandler}
        data={data}
        contentContainerClassName="bg-base-bg-default"
        renderItem={renderFeedItem}
        ListHeaderComponent={
          <>
            <View className="bg-base-white">
              <UserSearchSection query={query} />
              <HashtagSearchSection query={query} />
              <TopicSearchSection query={query} />
              <AnnouncementSearchSection query={query} />
            </View>
            <PostSearchSectionHeader queryResult={feedInfiniteQuery} />
          </>
        }
        ListFooterComponent={
          <>
            <SearchResultFooter queryResult={feedInfiniteQuery} className="mt-4 mx-4" />
            <View style={{ paddingBottom: insets.bottom + 128 }} />
          </>
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

interface PostSearchSectionHeaderProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
  className?: string
}
export function PostSearchSectionHeader({ queryResult, className }: PostSearchSectionHeaderProps) {
  if (
    queryResult.data &&
    queryResult.data.pages.length === 1 &&
    queryResult.data.pages[0].length === 0
  ) {
    return null
  }

  return (
    <H2 className={cn('text-base font-heading-semibold px-4 pt-2 bg-base-bg-default', className)}>
      โพสต์
    </H2>
  )
}

interface SearchResultFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
  className?: string
}

export function SearchResultFooter({ queryResult, className }: SearchResultFooterProps) {
  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return <FeedCardSkeleton className={className} />
  }
  if (
    queryResult.data &&
    queryResult.data.pages.length === 1 &&
    queryResult.data.pages[0].length === 0
  ) {
    // Empty State
    return null
  }
  // Reach end of feed
  return (
    <View className="flex flex-col items-center justify-center py-6">
      <Text className="text-base-text-medium font-heading-semibold">ไม่มีโพสต์เพิ่มเติม</Text>
    </View>
  )
}
