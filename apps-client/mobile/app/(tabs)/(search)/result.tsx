import React from 'react'
import { Keyboard, Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
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
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, SearchIcon } from 'lucide-react-native'

import { GetTopicFeedResponse } from '@api/backoffice/app'
import { FeedCard, FeedCardSkeleton } from '@app/components/feed/feed-card'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { AnnouncementSearchCard } from '@app/components/search/announcement-card'
import { HashtagSearchCard } from '@app/components/search/hashtag-card'
import { TopicSearchBigCard } from '@app/components/search/topic-card'
import { UserSearchCard } from '@app/components/search/user-card'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'

import { useSearchingContext } from './_layout'

const LIMIT = 10
export default function SearchResultPage() {
  const router = useRouter()
  const { state, dispatch } = useSearchingContext()
  const searchForm = useForm({
    defaultValues: {
      query: state.searchQuery,
    },
  })

  return (
    <Pressable onPress={Keyboard.dismiss} className="flex-1">
      <SafeAreaLayout>
        <View className="p-4 gap-3">
          {/* Search Header */}
          <View className="flex flex-row items-center gap-2">
            <Icon icon={SearchIcon} size={32} className="text-base-primary-default" />
            <H1 className="font-semibold text-base-primary-default text-3xl font-heading-semibold">
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
                  onChangeDebounceMs: 300,
                  onChange: ({ value }) => {
                    dispatch({ type: 'updateQuery', query: value })
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
        <SearchResult query={state.searchQuery} />
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
  const topicSearchQuery = reactQueryClient.useQuery(
    '/search/details/topics',
    {
      query: { search: query },
    },
    { enabled: !!query }
  )

  if (!topicSearchQuery.data || topicSearchQuery.data.length === 0) {
    return null
  }
  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4">หัวข้อ</H2>
      {topicSearchQuery.data.map((topic) => (
        <TopicSearchBigCard
          key={topic.id}
          id={topic.id}
          name={topic.name}
          bannerImage={topic.bannerImage || undefined}
          hashtags={topic.hashtags}
        />
      ))}
    </View>
  )
}

const HashtagSearchSection = ({ query }: { query: string }) => {
  // confirmation of hashtag search to show navigation card
  if (!query.startsWith('#')) {
    return null
  }

  const hashtagSearchQuery = reactQueryClient.useQuery(
    '/search/details/hashtags',
    {
      query: { search: query },
    },
    { enabled: !!query }
  )

  if (!hashtagSearchQuery.data || hashtagSearchQuery.data.length === 0) {
    return null
  }

  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4"># แฮชแท็ก</H2>
      {hashtagSearchQuery.data.map((hashtag) => (
        <HashtagSearchCard key={hashtag.id} id={hashtag.id} name={hashtag.name} />
      ))}
    </View>
  )
}

const AnnouncementSearchSection = ({ query }: { query: string }) => {
  const announcementSearchQuery = reactQueryClient.useQuery(
    '/search/details/announcements',
    {
      query: { search: query },
    },
    { enabled: !!query }
  )

  if (!announcementSearchQuery.data || announcementSearchQuery.data.length === 0) {
    return null
  }

  return (
    <View className="py-2 border-b border-base-outline-default bg-base-bg-white">
      <H2 className="text-base font-heading-semibold px-4">ประกาศ</H2>
      {announcementSearchQuery.data.map((announcement) => (
        <AnnouncementSearchCard
          key={announcement.id}
          id={announcement.id}
          title={announcement.title}
          type={announcement.type}
          date={announcement.publishedAt.toString()}
        />
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
    return feedInfiniteQuery.data.pages.flat()
  }, [feedInfiniteQuery.data])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetTopicFeedResponse[number]; index: number }) => {
      return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-3" />
    },
    []
  )

  return (
    <View className="border-b border-base-outline-default">
      <Animated.FlatList
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
