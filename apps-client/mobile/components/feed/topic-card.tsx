import React from 'react'
import { Pressable, View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Slide, SlideIndicators, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H3 } from '@pple-today/ui/typography'
import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { ArrowRightIcon, MessageSquareHeartIcon } from 'lucide-react-native'

import { LinearGradient } from '@app/components/linear-gradient'
import { reactQueryClient } from '@app/libs/api-client'

interface TopicCardProps {
  topic: {
    id: string
    name: string
    description: string
    imageUrl: string
    hashtags: {
      id: string
      name: string
    }[]
    followed: boolean
  }
  className?: string
}
export function TopicCard(props: TopicCardProps) {
  const [isFollowing, setIsFollowing] = React.useState(props.topic.followed)
  const followMutation = reactQueryClient.useMutation('post', '/topics/:topicId/follow', {})
  const unfollowMutation = reactQueryClient.useMutation('delete', '/topics/:topicId/follow', {})
  const toggleFollow = async () => {
    setIsFollowing(!isFollowing) // optimistic update
    if (isFollowing) {
      await unfollowMutation.mutateAsync({ pathParams: { topicId: props.topic.id } })
    } else {
      await followMutation.mutateAsync({ pathParams: { topicId: props.topic.id } })
    }
  }
  const router = useRouter()
  return (
    <Pressable
      className={cn(
        'h-[334px] w-[240px] rounded-2xl overflow-hidden bg-base-bg-default',
        props.className
      )}
      onPress={() => router.navigate(`/topic/${props.topic.id}`)}
    >
      <Image
        source={{ uri: props.topic.imageUrl }}
        className="absolute top-0 left-0 right-0 bottom-0"
      />
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
          <H3 className="text-base-text-invert text-xl font-anakotmai-bold line-clamp-2">
            {props.topic.name}
          </H3>
          <Text className="text-base-text-invert text-xs font-anakotmai-light line-clamp-4">
            {props.topic.description}
          </Text>
          {props.topic.hashtags.length > 0 && (
            <View className="flex flex-row gap-1 flex-wrap">
              <Badge variant="outline" className="border-base-primary-default">
                <Text className="text-base-text-invert">{props.topic.hashtags[0].name}</Text>
              </Badge>
              {props.topic.hashtags.length > 1 && (
                <Badge variant="outline" className="border-base-primary-default">
                  <Text className="text-base-text-invert">
                    + {props.topic.hashtags.length - 1} แฮชแท็ก
                  </Text>
                </Badge>
              )}
            </View>
          )}
        </View>
        <Button
          onPress={toggleFollow}
          variant={isFollowing ? 'outline-primary' : 'primary'}
          className={isFollowing ? 'bg-black active:bg-white/10' : ''}
        >
          <Text>{isFollowing ? 'กำลังติดตาม' : 'ติดตาม'} </Text>
        </Button>
      </View>
    </Pressable>
  )
}

const topics: TopicCardProps['topic'][] = [
  {
    id: '1',
    name: 'ลุยพื้นที่',
    description:
      '“ส้มสู้ไฟ” คือโครงการพรรคประชาชน ร่วมแก้ไฟป่า-ฝุ่น PM2.5 ภาคเหนือ เน้นแนวกันไฟ หนุนอาสา และขับเคลื่อน นโยบายสิ่งแวดล้อม',
    imageUrl: 'https://picsum.photos/200',
    followed: false,
    hashtags: [
      { id: '1', name: '#ส้มสู้ไฟ' },
      { id: '2', name: '#ไฟป่า' },
    ],
  },
  {
    id: '2',
    name: 'ลุยพื้นที่',
    description:
      '“ส้มสู้ไฟ” คือโครงการพรรคประชาชน ร่วมแก้ไฟป่า-ฝุ่น PM2.5 ภาคเหนือ เน้นแนวกันไฟ หนุนอาสา และขับเคลื่อน นโยบายสิ่งแวดล้อม',
    imageUrl: 'https://picsum.photos/200',
    followed: false,
    hashtags: [
      { id: '1', name: '#ส้มสู้ไฟ' },
      { id: '2', name: '#ไฟป่า' },
    ],
  },
  {
    id: '3',
    name: 'ลุยพื้นที่',
    description:
      '“ส้มสู้ไฟ” คือโครงการพรรคประชาชน ร่วมแก้ไฟป่า-ฝุ่น PM2.5 ภาคเหนือ เน้นแนวกันไฟ หนุนอาสา และขับเคลื่อน นโยบายสิ่งแวดล้อม',
    imageUrl: 'https://picsum.photos/200',
    followed: false,
    hashtags: [
      { id: '1', name: '#ส้มสู้ไฟ' },
      { id: '2', name: '#ไฟป่า' },
    ],
  },
  {
    id: '4',
    name: 'ลุยพื้นที่',
    description:
      '“ส้มสู้ไฟ” คือโครงการพรรคประชาชน ร่วมแก้ไฟป่า-ฝุ่น PM2.5 ภาคเหนือ เน้นแนวกันไฟ หนุนอาสา และขับเคลื่อน นโยบายสิ่งแวดล้อม',
    imageUrl: 'https://picsum.photos/200',
    followed: false,
    hashtags: [
      { id: '1', name: '#ส้มสู้ไฟ' },
      { id: '2', name: '#ไฟป่า' },
    ],
  },
]

export function TopicSuggestion() {
  return (
    <View>
      <View className="px-4 pt-4 flex flex-row justify-between items-center">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={MessageSquareHeartIcon} size={32} className="text-base-primary-default" />
          <H3 className="text-base-text-high font-anakotmai-medium text-2xl">หัวข้อน่าสนใจ</H3>
        </View>
        <Link asChild href="/(feed)/topic-suggestion">
          <Button variant="ghost">
            <Text>ดูทั้งหมด</Text>
            <Icon icon={ArrowRightIcon} />
          </Button>
        </Link>
      </View>
      <Slide
        count={topics.length}
        itemWidth={240}
        gap={8}
        paddingHorizontal={16}
        className="w-full pt-2 py-4"
      >
        <SlideScrollView>
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}
