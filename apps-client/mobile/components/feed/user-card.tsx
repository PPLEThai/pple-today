import React, { useCallback, useEffect } from 'react'
import { ScrollView, View } from 'react-native'
import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ArrowRightIcon, UserRoundPlusIcon } from 'lucide-react-native'

import { GetUserRecommendationResponse } from '@api/backoffice/app'
import { reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'
import { createImageUrl } from '@app/utils/image'

import { AvatarPPLEFallback } from '../avatar-pple-fallback'

interface UserCardProps {
  className?: string
  user: {
    id: string
    name: string
    profileImage: string | null
    address: {
      province: string
      district: string
    } | null
    followed?: boolean
  }
}

export function UserCard(props: UserCardProps) {
  const [isFollowing, setIsFollowing] = useUserFollowState(
    props.user.id,
    props.user.followed ?? false
  )
  const followMutation = reactQueryClient.useMutation('post', '/profile/:id/follow', {})
  const unfollowMutation = reactQueryClient.useMutation('delete', '/profile/:id/follow', {})
  const toggleFollow = async () => {
    setIsFollowing(!isFollowing) // optimistic update
    if (isFollowing) {
      await unfollowMutation.mutateAsync({ pathParams: { id: props.user.id } })
      return
    } else {
      await followMutation.mutateAsync({ pathParams: { id: props.user.id } })
    }
  }
  const router = useRouter()
  return (
    <AnimatedBackgroundPressable
      onPress={() => router.navigate(`/user/${props.user.id}`)}
      className={cn(
        'flex flex-col items-center gap-3 bg-base-bg-white border border-base-outline-default rounded-2xl p-4 h-[208px]',
        props.className
      )}
    >
      <Avatar alt={props.user.name} className="w-14 h-14">
        {props.user.profileImage && (
          <AvatarImage
            source={{ uri: createImageUrl(props.user.profileImage, { width: 56, height: 56 }) }}
          />
        )}
        <AvatarPPLEFallback />
      </Avatar>
      <View className="flex-1">
        <Text className="text-sm text-base-text-high font-heading-semibold text-center line-clamp-2">
          {props.user.name}
        </Text>
        {props.user.address && (
          <Text className="text-sm text-base-text-medium font-heading-regular text-center line-clamp-1">
            {/* TODO: check role */}
            สส. {props.user.address.province}
          </Text>
        )}
      </View>
      <Button
        variant={isFollowing ? 'outline-primary' : 'primary'}
        size="sm"
        onPress={toggleFollow}
        className="w-full"
      >
        <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
      </Button>
    </AnimatedBackgroundPressable>
  )
}

const useUserFollowQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'user-follow'],
  fetcher: (_: { userId: string }): boolean => {
    throw new Error('userFollowQuery should not be enabled')
  },
  enabled: false,
})
export function useUserFollowState(userId: string, initialData: boolean) {
  const userFollowQuery = useUserFollowQuery({
    variables: { userId },
    initialData: initialData,
  })
  const queryClient = useQueryClient()
  const setUserFollowState = useCallback(
    (data: boolean) => {
      queryClient.setQueryData(useUserFollowQuery.getKey({ userId }), data)
    },
    [queryClient, userId]
  )
  return [userFollowQuery.data, setUserFollowState] as const
}

export function UserSuggestion() {
  const router = useRouter()
  const session = useSession()
  const userSuggestionQuery = reactQueryClient.useQuery(
    '/profile/recommend',
    {},
    {
      select: useCallback((data: GetUserRecommendationResponse) => data.slice(0, 5), []), // limit to 5 suggestions
      enabled: !!session,
    }
  )
  useEffect(() => {
    if (userSuggestionQuery.error) {
      console.error('Fetching User Suggestion failed: ', JSON.stringify(userSuggestionQuery.error))
    }
  }, [userSuggestionQuery.error])
  if (!session) {
    return null
  }
  if (!userSuggestionQuery.data || userSuggestionQuery.data.length === 0) {
    return null
  }
  return (
    <View className="flex flex-col gap-4">
      <View className="flex flex-row justify-between items-center px-4 pt-4">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={UserRoundPlusIcon} size={32} className="text-base-primary-default" />
          <H2 className="text-2xl font-heading-semibold text-base-text-high">แนะนำให้ติดตาม</H2>
        </View>
        <Button variant="ghost" onPress={() => router.navigate('./user-suggestion')}>
          <Text>ดูเพิ่มเติม</Text>
          <Icon icon={ArrowRightIcon} size={16} />
        </Button>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        {userSuggestionQuery.data.map((user, i) => (
          <UserCard key={i} user={user} className="w-[164px]" />
        ))}
      </ScrollView>
    </View>
  )
}

export function UserCardSkeleton() {
  return <Skeleton className="rounded-2xl w-[164px] h-[208px] border border-base-outline-default" />
}
