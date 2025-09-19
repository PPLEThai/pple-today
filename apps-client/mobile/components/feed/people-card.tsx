import React from 'react'
import { ScrollView, View } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { ArrowRightIcon, UserRoundPlusIcon } from 'lucide-react-native'

import { reactQueryClient } from '@app/libs/api-client'

import { AvatarPPLEFallback } from '../avatar-pple-fallback'

interface PeopleCardProps {
  className?: string
  user: {
    id: string
    name: string
    avatarUrl?: string
    address?: {
      province: string
    }
    followed: boolean
  }
}

export function PeopleCard(props: PeopleCardProps) {
  const [isFollowing, setIsFollowing] = React.useState(props.user.followed)
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
      onPress={() => router.navigate(`/profile/${props.user.id}`)}
      className={cn(
        'flex flex-col items-center gap-3 bg-base-bg-white border border-base-outline-default rounded-2xl p-4 h-[208px]',
        props.className
      )}
    >
      <Avatar alt={props.user.name} className="w-14 h-14">
        <AvatarImage source={{ uri: props.user.avatarUrl }} />
        <AvatarPPLEFallback />
      </Avatar>
      <View className="flex-1">
        <Text className="text-sm text-base-text-high font-anakotmai-medium text-center line-clamp-2">
          {props.user.name}
        </Text>
        {props.user.address && (
          <Text className="text-sm text-base-text-medium font-anakotmai-light text-center line-clamp-1">
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

export function PeopleSuggestion() {
  const router = useRouter()
  return (
    <View className="flex flex-col gap-4">
      <View className="flex flex-row justify-between items-center px-4 pt-4">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={UserRoundPlusIcon} size={32} className="text-base-primary-default" />
          <H2 className="text-2xl font-anakotmai-medium text-base-text-high">แนะนำให้ติดตาม</H2>
        </View>
        <Button variant="ghost" onPress={() => router.navigate('/(feed)/people-suggestion')}>
          <Text>ดูเพิ่มเติม</Text>
          <Icon icon={ArrowRightIcon} size={16} />
        </Button>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <PeopleCard
            key={i}
            user={{
              id: '1',
              name: 'ศิริโรจน์ ธนิกกุล - Sirirot Thanikkun ศิริโรจน์ ธนิกกุล - Sirirot Thanikkun',
              followed: false,
              address: { province: 'กรุงเทพมหานคร' },
              avatarUrl:
                'https://pbs.twimg.com/profile_images/1782428433898708992/1voyv4_A_400x400.jpg',
            }}
            className="w-[164px]"
          />
        ))}
      </ScrollView>
    </View>
  )
}
