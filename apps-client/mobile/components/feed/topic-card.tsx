import React, { useCallback, useEffect } from 'react'
import { Pressable, View } from 'react-native'
import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { clsx, cn } from '@pple-today/ui/lib/utils'
import { Slide, SlideIndicators, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H3 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { ArrowRightIcon, MessageSquareHeartIcon } from 'lucide-react-native'

import { GetTopicRecommendationResponse } from '@api/backoffice/app'
import { LinearGradient } from '@app/components/linear-gradient'
import { reactQueryClient } from '@app/libs/api-client'
import { useAuthMe, useSession } from '@app/libs/auth'
import { createImageUrl } from '@app/utils/image'

interface TopicCardProps {
  topic: {
    id: string
    name: string
    description: string | null
    bannerImage: string | null
    hashTags: {
      id: string
      name: string
    }[]
    followed?: boolean
  }
  className?: string
}

export function TopicCard(props: TopicCardProps) {
  const { isFollowing, toggleFollow } = useTopicFollow(
    props.topic.id,
    props.topic.followed ?? false
  )
  const user = useAuthMe()
  const router = useRouter()
  return (
    <Pressable
      className={cn(
        'h-[334px] w-[240px] rounded-2xl overflow-hidden bg-base-bg-default',
        props.className
      )}
      onPress={() => router.navigate(`/topic/${props.topic.id}`)}
    >
      {props.topic.bannerImage ? (
        <Image
          source={{
            uri: createImageUrl(props.topic.bannerImage, {
              width: 240,
              height: 334,
            }),
          }}
          className="absolute top-0 left-0 right-0 bottom-0"
        />
      ) : (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-gray-800" />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent']}
        className="absolute top-0 left-0 right-0 h-[40px]"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,1)']}
        locations={[0, 0.6]}
        className="absolute left-0 right-0 bottom-0 h-[204px]"
      />
      <View className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-3">
        <View className="flex flex-col gap-1">
          <H3 className="text-base-text-invert text-xl font-heading-bold line-clamp-2">
            {props.topic.name}
          </H3>
          {props.topic.description && (
            <Text className="text-base-text-invert text-xs font-heading-regular line-clamp-4">
              {props.topic.description}
            </Text>
          )}
          {props.topic.hashTags.length > 0 && (
            <View className="flex flex-row gap-1 flex-wrap">
              <Badge variant="outline" className="border-base-primary-default pointer-events-none">
                <Text className="text-base-text-invert">{props.topic.hashTags[0].name}</Text>
              </Badge>
              {props.topic.hashTags.length > 1 && (
                <Badge
                  variant="outline"
                  className="border-base-primary-default pointer-events-none"
                >
                  <Text className="text-base-text-invert">
                    + {props.topic.hashTags.length - 1} แฮชแท็ก
                  </Text>
                </Badge>
              )}
            </View>
          )}
        </View>
        <Button
          onPress={toggleFollow}
          variant={isFollowing ? 'outline-primary' : 'primary'}
          disabled={user.data?.isSuspended}
          className={clsx(isFollowing && 'bg-black active:bg-white/10')}
        >
          <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
        </Button>
      </View>
    </Pressable>
  )
}

const useTopicFollowQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'topic-follow'],
  fetcher: (_: { topicId: string }): boolean => {
    throw new Error('topicFollowQuery should not be enabled')
  },
  enabled: false,
})
export function useTopicFollow(topicId: string, initialData: boolean) {
  const topicFollowQuery = useTopicFollowQuery({
    variables: { topicId },
    initialData: initialData,
  })
  const user = useAuthMe()
  const queryClient = useQueryClient()
  const setTopicFollowState = useCallback(
    (data: boolean) => {
      queryClient.setQueryData(useTopicFollowQuery.getKey({ topicId }), data)
    },
    [queryClient, topicId]
  )
  const isFollowing = topicFollowQuery.data
  const followMutation = reactQueryClient.useMutation('post', '/topics/:topicId/follow', {})
  const unfollowMutation = reactQueryClient.useMutation('delete', '/topics/:topicId/follow', {})
  const toggleFollow = async () => {
    if (user.data?.isSuspended) {
      return
    }

    setTopicFollowState(!isFollowing) // optimistic update
    if (isFollowing) {
      await unfollowMutation.mutateAsync({ pathParams: { topicId: topicId } })
    } else {
      await followMutation.mutateAsync({ pathParams: { topicId: topicId } })
    }
    queryClient.invalidateQueries({ queryKey: reactQueryClient.getQueryKey('/profile/me') })
  }
  return { isFollowing, toggleFollow }
}

export function TopicSuggestion() {
  const session = useSession()
  const topicSuggestionQuery = reactQueryClient.useQuery(
    '/topics/recommend',
    {},
    {
      select: useCallback((data: GetTopicRecommendationResponse) => data.slice(0, 5), []), // limit to 5 suggestions
      enabled: !!session,
    }
  )
  useEffect(() => {
    if (topicSuggestionQuery.error) {
      console.error(
        'Fetching Topic Suggestion failed: ',
        JSON.stringify(topicSuggestionQuery.error)
      )
    }
  }, [topicSuggestionQuery.error])
  if (!session) {
    return null
  }
  if (!topicSuggestionQuery.data || topicSuggestionQuery.data.length === 0) {
    return null
  }
  return (
    <View>
      <View className="px-4 pt-4 flex flex-row justify-between items-center">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={MessageSquareHeartIcon} size={32} className="text-base-primary-default" />
          <H3 className="text-base-text-high font-heading-semibold text-2xl">หัวข้อน่าสนใจ</H3>
        </View>
        <Link asChild href="/topic/suggestion">
          <Button variant="ghost">
            <Text>ดูทั้งหมด</Text>
            <Icon icon={ArrowRightIcon} />
          </Button>
        </Link>
      </View>
      <Slide
        count={topicSuggestionQuery.data.length}
        itemWidth={240}
        gap={8}
        paddingHorizontal={16}
        className="w-full pt-2 py-4"
      >
        <SlideScrollView>
          {topicSuggestionQuery.data.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}
