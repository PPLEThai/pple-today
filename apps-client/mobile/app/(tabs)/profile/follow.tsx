import React from 'react'
import { ScrollView, View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/ui/dialog'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { CircleUserRoundIcon, Heart, MessageSquareHeartIcon } from 'lucide-react-native'

import type { GetTopicsResponse } from '@api/backoffice/app'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { Header } from '@app/components/header-navigation'
import { reactQueryClient } from '@app/libs/api-client'

export default function FollowPage() {
  return (
    <View className="pt-safe flex-1 flex-col">
      <Header icon={Heart} title="จัดการเนื้อหาที่ติดตาม" />
      <ScrollView>
        <NumberFollowingSection />
        <PeopleFollowingSection />
        <TopicsFollowingSection />
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
          <Text className="text-base text-base-text-high font-heading-semibold">หัวข้อ</Text>
        </View>

        <Text className="text-base text-base-text-high font-heading-regular">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-heading-semibold">
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
          <Text className="text-base text-base-text-high font-heading-semibold">ผู้คน</Text>
        </View>
        <Text className="text-base text-base-text-high font-heading-regular">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-heading-semibold">
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

  if (followingPeopleQuery.isLoading || !followingPeopleQuery.data) {
    return (
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-heading-semibold">ผู้คน</Text>
        </View>
        <View className="mt-2 px-4 flex flex-col">
          <PeopleFollowingSkeleton />
          <PeopleFollowingSkeleton />
          <PeopleFollowingSkeleton />
        </View>
      </View>
    )
  }

  if (followingPeopleQuery.data.length === 0)
    return (
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-heading-semibold">ผู้คน</Text>
        </View>
        <View className="mt-2 p-4 flex flex-col">
          <Text className="font-heading-regular text-center">คุณยังไม่ได้ติดตามใคร</Text>
        </View>
      </View>
    )

  return (
    <>
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-heading-semibold">ผู้คน</Text>
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
  const queryClient = useQueryClient()
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
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/profile/me'),
            })
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
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/profile/me'),
            })
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
        <Text className="font-body-light flex-1 line-clamp-1 mr-3">{profile.name}</Text>
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

const TopicsFollowingSection = () => {
  const followingTopicsQuery = reactQueryClient.useQuery('/topics/follows', {})

  if (followingTopicsQuery.isLoading || !followingTopicsQuery.data) {
    return (
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-heading-semibold">หัวข้อ</Text>
        </View>
        <View className="flex flex-col">
          <TopicsFollowingSkeleton />
          <TopicsFollowingSkeleton />
          <TopicsFollowingSkeleton />
        </View>
      </View>
    )
  }

  if (followingTopicsQuery.data.length === 0) {
    return (
      <View className="my-2 flex flex-col">
        <View className="px-4 items-start">
          <Text className="text-base text-base-text-high font-heading-semibold">หัวข้อ</Text>
        </View>
        <View className="mt-2 p-4 flex flex-col">
          <Text className="font-heading-regular text-center">คุณยังไม่ได้ติดตามหัวข้อใดๆ</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="my-2 flex flex-col">
      <View className="px-4 items-start">
        <Text className="text-base text-base-text-high font-heading-semibold">หัวข้อ</Text>
      </View>
      <View className="flex flex-col">
        {followingTopicsQuery.data.map((item) => (
          <TopicsFollowingItem
            key={item.id}
            id={item.id}
            name={item.name}
            bannerImage={item.bannerImage ?? ''}
            hashtags={item.hashTags}
          />
        ))}
      </View>
    </View>
  )
}

type HashtagList = GetTopicsResponse[number]['hashTags']

interface TopicsFollowingItemProps {
  id: string
  name: string
  bannerImage: string
  hashtags: HashtagList
}

const TopicsFollowingItem = (topic: TopicsFollowingItemProps) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isFollowing, setIsFollowing] = React.useState(true)

  const followTopicMutation = reactQueryClient.useMutation('post', '/topics/:topicId/follow', {})
  const unfollowTopicMutation = reactQueryClient.useMutation(
    'delete',
    '/topics/:topicId/follow',
    {}
  )

  const toggleFollow = async () => {
    if (isFollowing) {
      await unfollowTopicMutation.mutateAsync(
        {
          pathParams: { topicId: topic.id },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/profile/me'),
            })
            setIsFollowing(!isFollowing)
          },
        }
      )
      return
    } else {
      await followTopicMutation.mutateAsync(
        {
          pathParams: { topicId: topic.id },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/profile/me'),
            })
            setIsFollowing(!isFollowing)
          },
        }
      )
    }
  }

  const renderHashtags = (hashtags: HashtagList) => {
    if (hashtags.length === 0) return null
    if (hashtags.length === 1) {
      return (
        <Link href={`/(feed)/hashtag/${hashtags[0].id}`} asChild>
          <Badge variant="secondary">
            <Text>{hashtags[0].name}</Text>
          </Badge>
        </Link>
      )
    }

    return (
      <>
        <Link href={`/(feed)/hashtag/${hashtags[0].id}`} asChild>
          <Badge variant="secondary">
            <Text>{hashtags[0].name}</Text>
          </Badge>
        </Link>
        <Dialog>
          <DialogTrigger asChild>
            <Badge variant="secondary">
              <Text>{hashtags.length > 1 ? `#อื่น ๆ (${hashtags.length - 1})` : ''}</Text>
            </Badge>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-h-[70vh] p-4 pt-6 mx-4 flex flex-col">
            <DialogHeader>
              <DialogTitle className="w-full text-xl text-start font-anakotmai-medium text-base-primary-default">
                # ที่เกี่ยวข้อง
              </DialogTitle>
              <DialogDescription className="w-full text-start text-sm font-anakotmai-light leading-tight text-base-text-medium">
                แฮชแท็กที่เกี่ยวข้องกับหัวข้อนี้
              </DialogDescription>
            </DialogHeader>
            <ScrollView
              className="border border-base-outline-default bg-base-bg-light rounded-lg"
              contentContainerClassName="w-full flex flex-row gap-2 flex-wrap m-2 min-h-[144px]"
            >
              {hashtags.map((hashtag) => (
                <DialogClose key={hashtag.id} asChild>
                  <Button
                    className="rounded-full border border-base-outline-default py-1.5 h-8 bg-base-bg-light"
                    variant="secondary"
                    onPress={() => router.navigate(`/(feed)/hashtag/${hashtag.id}`)}
                  >
                    <Text className="text-sm font-anakotmai-medium">{hashtag.name}</Text>
                  </Button>
                </DialogClose>
              ))}
            </ScrollView>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <View className="items-center px-4 my-2 gap-4 flex flex-row">
      <Image
        source={{
          uri: topic.bannerImage,
        }}
        contentFit="cover"
        style={{ width: 80, height: '100%', borderRadius: 12 }}
        transition={300}
      />
      <View className="flex-1 flex flex-col gap-2">
        <Text className="font-heading-semibold text-base text-base-text-high">{topic.name}</Text>
        <View className="flex flex-row gap-2 mb-0.5 flex-wrap min-h-5">
          {renderHashtags(topic.hashtags)}
        </View>
        <Button
          variant={isFollowing ? 'outline-primary' : 'primary'}
          size="sm"
          onPress={toggleFollow}
        >
          <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
        </Button>
      </View>
    </View>
  )
}

const TopicsFollowingSkeleton = () => {
  return (
    <View className="items-center px-4 my-2 gap-4 flex flex-row">
      <Skeleton className="h-[98px] w-[80px] rounded-xl" />
      <View className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <View className="flex flex-row gap-2 mb-1 flex-wrap">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </View>
        <Skeleton className="h-9 w-full rounded-lg" />
      </View>
    </View>
  )
}
