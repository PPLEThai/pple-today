import React, { useEffect } from 'react'
import { FlatList, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/ui/dialog'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, HashIcon, InfoIcon } from 'lucide-react-native'

import { GetTopicFeedResponse, GetTopicsResponse } from '@api/backoffice/app'
import { FeedFooter } from '@app/components/feed'
import { FeedCard } from '@app/components/feed/feed-card'
import { useLightStatusBar } from '@app/context/status-bar'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'

const LIMIT = 10
export default function TopicDetailPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const topicId = params.topicId as string
  useEffect(() => {
    if (!topicId) {
      router.dismissTo('/')
    }
  }, [topicId, router])
  const topicQuery = reactQueryClient.useQuery('/topics/:id', {
    pathParams: { id: topicId! },
    enabled: !!topicId,
  })

  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/topic'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/topic', {
        query: { page: pageParam, limit: LIMIT, topicId: topicId! },
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
    enabled: !!topicId,
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
      return <FeedCard key={item.id} feedItem={item} className="mx-0" />
    },
    []
  )

  const insets = useSafeAreaInsets()
  useLightStatusBar()

  if (!topicId) {
    return null
  }
  if (!topicQuery.data) {
    return null
  }
  const topic = topicQuery.data

  return (
    <View className="flex-1 flex flex-col bg-base-bg-default">
      {/* TODO: bleed top safe area */}
      <View className="bg-gray-500 pt-safe">
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
          className="absolute top-0 left-0 right-0"
          style={{ height: insets.top }}
        />
        {topic.bannerImage && (
          <Image
            source={{ uri: topic.bannerImage }}
            className="absolute top-0 bottom-0 left-0 right-0"
          />
        )}
        <View className="flex flex-col p-4 gap-4">
          <Button
            variant="outline-primary"
            size="icon"
            onPress={() => router.back()}
            aria-label="กลับ"
            className="bg-transparent active:bg-white/10"
          >
            <Icon icon={ArrowLeftIcon} size={24} />
          </Button>
          {/* TODO: Animation when scroll */}
          <View className="flex flex-col gap-2">
            <H1 className="text-3xl font-anakotmai-bold text-base-text-invert">{topic.name}</H1>
            <Button size="sm">
              <Text>ติดตาม</Text>
            </Button>
          </View>
        </View>
      </View>
      <FlatList
        data={data}
        contentContainerClassName="bg-base-bg-default py-4 px-3"
        ListHeaderComponent={
          <View className="flex flex-col gap-3">
            <View className="rounded-2xl border border-base-outline-default bg-base-bg-white flex flex-col gap-2 p-3">
              <View className="flex flex-row items-center gap-2">
                <Icon icon={InfoIcon} size={24} className="text-base-primary-default" />
                <H2 className="text-base text-base-text-high font-anakotmai-medium">
                  เกี่ยวกับหัวข้อ
                </H2>
              </View>
              <Text className="text-sm text-base-text-medium font-noto-medium">
                {topic.description}
              </Text>
            </View>
            {topic.hashTags.length > 0 && (
              <View className="rounded-2xl border border-base-outline-default bg-base-bg-white flex flex-col gap-2 p-3">
                <View className="flex flex-row items-center gap-2">
                  <Icon icon={HashIcon} size={24} className="text-base-primary-default" />
                  <H2 className="text-base text-base-text-high font-anakotmai-medium">
                    ที่เกี่ยวข้อง
                  </H2>
                </View>
                <View className="flex flex-row flex-wrap gap-2">
                  {topic.hashTags.slice(0, 4).map((tag) => (
                    <Link href={`/(feed)/hashtag/${tag.id}`} key={tag.id} asChild>
                      <Badge variant="outline" className="px-4 py-1.5">
                        <Text className="text-sm text-base-text-high font-anakotmai-medium">
                          {tag.name}
                        </Text>
                      </Badge>
                    </Link>
                  ))}
                  {topic.hashTags.length > 4 && <MoreHashtagDialog hashTags={topic.hashTags} />}
                </View>
              </View>
            )}
          </View>
        }
        renderItem={renderFeedItem}
        ListFooterComponent={<FeedFooter queryResult={feedInfiniteQuery} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
      />
    </View>
  )
}

interface MoreHashtagDialogProps {
  hashTags: GetTopicsResponse[number]['hashTags']
}
function MoreHashtagDialog({ hashTags }: MoreHashtagDialogProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge variant="outline" className="px-4 py-1.5">
          <Text className="text-sm text-base-text-high font-anakotmai-medium">
            ดูเพิ่มเติม ({hashTags.length - 4})
          </Text>
        </Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="items-start gap-1">
          <DialogTitle className="text-xl font-anakotmai-medium text-base-primary-default">
            # ที่เกี่ยวข้อง
          </DialogTitle>
          <DialogDescription className="text-sm text-base-text-medium font-anakotmai-light">
            แฮชแท็กที่เกี่ยวข้องกับหัวข้อนี้
          </DialogDescription>
        </DialogHeader>
        <ScrollView
          contentContainerClassName="flex flex-row p-2 flex-wrap gap-2"
          className="border border-base-outline-default rounded-xl bg-base-bg-light max-h-80"
        >
          {hashTags.map((tag) => (
            <Link
              href={`/(feed)/hashtag/${tag.id}`}
              key={tag.id}
              asChild
              onPress={() => setOpen(false)}
            >
              <Badge variant="outline" className="px-4 py-1.5">
                <Text className="text-sm text-base-text-high font-anakotmai-medium">
                  {tag.name}
                </Text>
              </Badge>
            </Link>
          ))}
        </ScrollView>
      </DialogContent>
    </Dialog>
  )
}
