import React from 'react'
import { View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, UserIcon } from 'lucide-react-native'

import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { useUserFollowState } from '@app/components/feed/user-card'
import { reactQueryClient } from '@app/libs/api-client'
import { renderCount } from '@app/utils/count'

export default function ProfilePage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const userId = params.userId as string

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

  React.useEffect(() => {
    if (!userId) {
      router.dismissTo('/')
    }
  }, [userId, router])

  const ProfileSection = () => {
    if (userDetailsQuery.isLoading) {
      return <ProfileSectionSkeleton />
    }

    if (!userDetailsQuery.data) {
      return null
    }

    return (
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
          className="mx-4"
        >
          <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
        </Button>
      </View>
    )
  }

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="bg-base-bg-white pb-4">
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
        <ProfileSection />
      </View>
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
      <Skeleton className="h-9 mx-4" />
    </View>
  )
}
