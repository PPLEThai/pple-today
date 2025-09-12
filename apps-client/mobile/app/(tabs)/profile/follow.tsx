import React from 'react'
import { ScrollView, View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { CircleUserRoundIcon, Heart, MessageSquareHeartIcon } from 'lucide-react-native'

import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { Header } from '@app/components/header-navigation'
import { reactQueryClient } from '@app/libs/api-client'

export default function FollowPage() {
  return (
    <View className="flex-1 flex-col">
      <Header icon={Heart} title="จัดการเนื้อหาที่ติดตาม" />
      <ScrollView>
        <NumberFollowingSection />
        <PeopleFollowingSection />
      </ScrollView>
    </View>
  )
}

const NumberFollowingSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})

  return (
    <View className="m-4 mb-6 flex flex-col items-center py-2 justify-between gap-2 bg-base-bg-default rounded-xl border border-base-outline-default">
      <View className="flex flex-row justify-between items-center px-2 w-full">
        <View className="flex flex-row gap-3 items-center">
          <Icon
            icon={MessageSquareHeartIcon}
            className="text-base-primary-default"
            size={24}
            strokeWidth={1}
          />
          <Text className="text-base text-base-text-high font-anakotmai-medium">หัวข้อ</Text>
        </View>

        <Text className="text-base text-base-text-high font-anakotmai-light">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-anakotmai-medium">
              {profileQuery.data.numberOfFollowingTopics}
            </Text>
          )}{' '}
          หัวข้อ
        </Text>
      </View>
      <View className="flex flex-row justify-between items-center px-2 w-full">
        <View className="flex flex-row gap-3 items-center">
          <Icon
            icon={CircleUserRoundIcon}
            className="text-base-primary-default"
            size={24}
            strokeWidth={1}
          />
          <Text className="text-base text-base-text-high font-anakotmai-medium">ผู้คน</Text>
        </View>
        <Text className="text-base text-base-text-high font-anakotmai-light">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-anakotmai-medium">
              {profileQuery.data.numberOfFollowing}
            </Text>
          )}{' '}
          คน
        </Text>
      </View>
    </View>
  )
}

const PeopleFollowingSection = () => {
  const followingPeopleQuery = reactQueryClient.useQuery('/profile/follow', {})

  if (followingPeopleQuery.isLoading) {
    return (
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-anakotmai-medium">ผู้คน</Text>
        </View>
        <View className="mt-2 px-4 flex flex-col">
          <PeopleFollowingSkeleton />
          <PeopleFollowingSkeleton />
          <PeopleFollowingSkeleton />
        </View>
      </View>
    )
  }

  if (!followingPeopleQuery.data || followingPeopleQuery.data.length === 0)
    return (
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-anakotmai-medium">ผู้คน</Text>
        </View>
        <View className="mt-2 p-4 flex flex-col">
          <Text className="font-anakotmai-light text-center">คุณยังไม่ได้ติดตามใคร</Text>
        </View>
      </View>
    )

  return (
    <>
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-anakotmai-medium">ผู้คน</Text>
        </View>
        <View className="mt-2 px-4 flex flex-col">
          {followingPeopleQuery.data.map((item) => (
            <PeopleFollowingItem
              key={item.id}
              id={item.id}
              profileImage={item.profileImage ?? ''}
              name={item.name}
              onPress={() => {}}
            />
          ))}
        </View>
      </View>
    </>
  )
}

interface PeopleFollowingItemProps {
  id: string
  profileImage: string
  name: string
  onPress: () => void
}

const PeopleFollowingItem = (profile: PeopleFollowingItemProps) => {
  const [isFollowing, setIsFollowing] = React.useState(true)

  const followMutation = reactQueryClient.useMutation('post', '/profile/:id/follow', {})
  const unfollowMutation = reactQueryClient.useMutation('delete', '/profile/:id/follow', {})

  const toggleFollow = async () => {
    if (isFollowing) {
      await unfollowMutation.mutateAsync(
        {
          pathParams: { id: profile.id },
        },
        {
          onSuccess: () => {
            setIsFollowing(!isFollowing)
          },
        }
      )
      return
    } else {
      await followMutation.mutateAsync(
        {
          pathParams: { id: profile.id },
        },
        {
          onSuccess: () => {
            setIsFollowing(!isFollowing)
          },
        }
      )
    }
  }

  return (
    <View className="flex flex-row justify-between items-center px-2 my-3">
      <View className="flex flex-row items-center gap-2 flex-1">
        <Avatar className="size-8" alt={profile.name}>
          <AvatarImage
            source={{
              uri: profile.profileImage,
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
        <Text className="font-noto-light flex-1">{profile.name}</Text>
      </View>
      <Button
        variant={isFollowing ? 'outline-primary' : 'primary'}
        size="sm"
        onPress={toggleFollow}
      >
        <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
      </Button>
    </View>
  )
}

const PeopleFollowingSkeleton = () => {
  return (
    <View className="flex flex-row justify-between items-center px-2 my-3 gap-2">
      <View className="flex flex-row items-center gap-2 flex-1">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-12 flex-1 w-44" />
      </View>
      <Skeleton className="h-9 w-24 px-3 rounded-lg" />
    </View>
  )
}
