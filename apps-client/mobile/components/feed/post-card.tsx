import * as React from 'react'
import { ImageURISource, Pressable, View } from 'react-native'
import ImageView from 'react-native-image-viewing'
import { TextProps } from 'react-native-svg'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import {
  HeartCrackIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  Share2Icon,
} from 'lucide-react-native'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { MoreOrLess } from '@app/components/more-or-less'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

interface PostCardProps {
  author: {
    name: string
    district: string
    profileImageUrl: string
  }
  hashTags: {
    id: string
    name: string
  }[]
  createdAt: string
  content: string
  reactions: { type: 'UP_VOTE' | 'DOWN_VOTE'; count: number }[]
  commentCount: number
  // TODO: support media type VIDEO
  media: { type: 'IMAGE'; imageSource: ImageURISource; description?: string }[]
}

export const PostCard = React.memo(function PostCard(props: PostCardProps) {
  const upvoteReaction = props.reactions.find((r) => r.type === 'UP_VOTE')!

  return (
    <View className="flex flex-col gap-3 p-4 bg-base-bg-white border border-base-outline-default rounded-2xl mt-4">
      <View className="flex flex-row items-center justify-between">
        <View className="flex flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-base-primary-medium flex items-center justify-center mr-3">
            <Icon icon={PPLEIcon} width={20} height={20} className="text-white" />
          </View>
          <View className="flex flex-col">
            <Text className="text-base-text-medium font-anakotmai-medium text-sm">
              {props.author.name}
            </Text>
            <Text className="text-base-text-medium font-anakotmai-light text-sm">
              {props.author.district} | {formatDateInterval(props.createdAt)}
            </Text>
          </View>
        </View>
        <Button variant="ghost" size="icon" aria-label="Share">
          <Icon
            icon={Share2Icon}
            width={16}
            height={16}
            className="text-base-text-high"
            strokeWidth={1}
          />
        </Button>
      </View>
      {props.media.length > 0 && <Lightbox media={props.media} />}
      <View>
        <MoreOrLess
          numberOfLines={3}
          moreText="อ่านเพิ่มเติม"
          lessText="แสดงน้อยลง"
          animated
          textComponent={TextPost}
          buttonComponent={ButtonTextPost}
        >
          {props.content}
        </MoreOrLess>
      </View>
      <View className="flex flex-row flex-wrap gap-1">
        {props.hashTags.map((tag) => (
          // TODO: link
          <Badge variant="secondary" key={tag.id}>
            <Text>{tag.name}</Text>
          </Badge>
        ))}
      </View>
      <View className="flex flex-row justify-between items-center">
        <View className="flex flex-row gap-1 items-center">
          <Icon
            icon={HeartHandshakeIcon}
            size={18}
            className="fill-base-primary-medium text-white"
            strokeWidth={1}
          />
          <Text className="text-xs font-anakotmai-light text-base-text-medium">
            {upvoteReaction.count}
          </Text>
        </View>
        {props.commentCount > 0 && (
          <Pressable>
            <Text className="text-xs font-anakotmai-light text-base-text-medium">
              {props.commentCount} ความคิดเห็น
            </Text>
          </Pressable>
        )}
      </View>
      <View className="flex flex-col border-t border-base-outline-default pt-4 pb-1">
        <View className="flex flex-row justify-between gap-2">
          <View className="flex flex-row gap-2">
            <Pressable className="flex flex-row items-center gap-1">
              <Icon
                icon={HeartHandshakeIcon}
                size={20}
                strokeWidth={1}
                className="text-base-text-high"
              />
              <Text className="text-sm font-anakotmai-light text-base-text-high">เห็นด้วย</Text>
            </Pressable>
            <Pressable className="flex flex-row items-center gap-1">
              <Icon
                icon={HeartCrackIcon}
                size={20}
                strokeWidth={1}
                className="text-base-text-high"
              />
              <Text className="text-sm font-anakotmai-light text-base-text-high">ไม่เห็นด้วย</Text>
            </Pressable>
          </View>
          <Pressable className="flex flex-row items-center gap-1">
            <Icon
              icon={MessageCircleIcon}
              size={20}
              strokeWidth={1}
              className="text-base-text-high"
            />
            <Text className="text-sm font-anakotmai-light text-base-text-high">ความคิดเห็น</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
})

function TextPost(props: TextProps) {
  return <Text {...props} className="text-base-text-high font-noto-light text-base" />
}
function ButtonTextPost(props: TextProps) {
  return <Text {...props} className="text-base-primary-default font-noto-light text-base" />
}

function formatDateInterval(date: string): string {
  const now = new Date()
  const diff = dayjs(now).diff(dayjs(date))
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} วัน`
  } else if (hours > 0) {
    return `${hours} ชั่วโมง`
  } else if (minutes > 0) {
    return `${minutes} นาที`
  } else {
    return `เพิ่งเกิดขึ้น`
  }
}

interface LightboxProps {
  media: { type: 'IMAGE'; imageSource: ImageURISource; description?: string }[]
}
function Lightbox(props: LightboxProps) {
  const [visible, setIsVisible] = React.useState(false)
  const [imageIndex, setImageIndex] = React.useState(0)
  const onPress = (index: number) => {
    setImageIndex(index)
    setIsVisible(true)
  }
  return (
    <View className="rounded-lg overflow-hidden">
      <ImageLayout firstImageType="square" media={props.media} onPress={onPress} />
      <ImageView
        images={props.media.map((m) => m.imageSource)}
        imageIndex={imageIndex}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
      />
    </View>
  )
}

// TODO: first pic dimension
interface ImageLayoutProps {
  firstImageType: 'landscape' | 'portrait' | 'square'
  media: { type: 'IMAGE'; imageSource: ImageURISource; description?: string }[]
  onPress: (index: number) => void
}
function ImageLayout(props: ImageLayoutProps) {
  switch (props.firstImageType) {
    case 'landscape': {
      if (props.media.length === 1) {
        return (
          <ImagePressable
            index={0}
            onPress={props.onPress}
            media={props.media[0]!}
            className="aspect-[3/2]"
          />
        )
      } else if (props.media.length === 2) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            {props.media.map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-1"
              />
            ))}
          </View>
        )
      } else if (props.media.length === 3) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            {props.media.slice(0, 1).map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-1"
              />
            ))}
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(1).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i + 1}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
          </View>
        )
      } else if (props.media.length === 4) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(0, 2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i + 2}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
          </View>
        )
      } else if (props.media.length > 4) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            {props.media.slice(0, 1).map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-[2]"
              />
            ))}
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(1, 4).map((m, i) => {
                if (i === 2) {
                  return (
                    <View key={i} className="flex-1 relative">
                      <ImagePressable key={i} index={i + 1} onPress={props.onPress} media={m} />
                      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] pointer-events-none">
                        <Text className="text-2xl text-white font-anakotmai-medium">
                          +{props.media.length - 4}
                        </Text>
                      </View>
                    </View>
                  )
                }
                return (
                  <ImagePressable
                    key={i}
                    index={i + 1}
                    onPress={props.onPress}
                    media={m}
                    className="flex-1"
                  />
                )
              })}
            </View>
          </View>
        )
      }
      break
    }

    case 'portrait': {
      if (props.media.length === 1) {
        return (
          <ImagePressable
            index={0}
            onPress={props.onPress}
            media={props.media[0]!}
            className="aspect-[3/4]"
          />
        )
      } else if (props.media.length === 2) {
        return (
          <View className="flex flex-row gap-0.5 aspect-[5/4]">
            {props.media.map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-1"
              />
            ))}
          </View>
        )
      } else if (props.media.length === 3) {
        return (
          <View className="flex flex-row gap-0.5 aspect-square">
            {props.media.slice(0, 1).map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-1"
              />
            ))}
            <View className="flex flex-col gap-0.5 flex-1">
              {props.media.slice(1).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i + 1}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
          </View>
        )
      } else if (props.media.length === 4) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(0, 2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i + 2}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
          </View>
        )
      } else if (props.media.length > 4) {
        return (
          <View className="flex flex-row gap-0.5 aspect-square">
            {props.media.slice(0, 1).map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-[2]"
              />
            ))}
            <View className="flex flex-col gap-0.5 flex-1">
              {props.media.slice(1, 4).map((m, i) => {
                if (i === 2) {
                  return (
                    <View key={i} className="flex-1 relative">
                      <ImagePressable key={i} index={i + 1} onPress={props.onPress} media={m} />
                      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] pointer-events-none">
                        <Text className="text-2xl text-white font-anakotmai-medium">
                          +{props.media.length - 4}
                        </Text>
                      </View>
                    </View>
                  )
                }
                return (
                  <ImagePressable
                    key={i}
                    index={i + 1}
                    onPress={props.onPress}
                    media={m}
                    className="flex-1"
                  />
                )
              })}
            </View>
          </View>
        )
      }
      break
    }
    case 'square': {
      if (props.media.length === 1) {
        return (
          <ImagePressable
            index={0}
            onPress={props.onPress}
            media={props.media[0]!}
            className="aspect-square"
          />
        )
      } else if (props.media.length === 2) {
        return (
          <View className="flex flex-row gap-0.5 aspect-[2/1]">
            {props.media.map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-1"
              />
            ))}
          </View>
        )
      } else if (props.media.length === 3) {
        return (
          <View className="flex flex-row gap-0.5 aspect-[2/1]">
            {props.media.slice(0, 1).map((m, i) => (
              <ImagePressable
                key={i}
                index={i}
                onPress={props.onPress}
                media={m}
                className="flex-1"
              />
            ))}
            <View className="flex flex-col gap-0.5 flex-1">
              {props.media.slice(1).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i + 1}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
          </View>
        )
      } else if (props.media.length === 4) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(0, 2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-row gap-0.5 flex-1">
              {props.media.slice(2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i + 2}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
          </View>
        )
      } else if (props.media.length > 4) {
        return (
          <View className="flex flex-row gap-0.5 aspect-square">
            <View className="flex flex-col gap-0.5 flex-1">
              {props.media.slice(0, 2).map((m, i) => (
                <ImagePressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  media={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-col gap-0.5 flex-1">
              {props.media.slice(2, 4).map((m, i) => {
                if (i === 1) {
                  return (
                    <View key={i} className="flex-1 relative">
                      <ImagePressable key={i} index={i + 2} onPress={props.onPress} media={m} />
                      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] rounded-[2px] pointer-events-none">
                        <Text className="text-2xl text-white font-anakotmai-medium">
                          +{props.media.length - 4}
                        </Text>
                      </View>
                    </View>
                  )
                }
                return (
                  <ImagePressable
                    key={i}
                    index={i + 1}
                    onPress={props.onPress}
                    media={m}
                    className="flex-1"
                  />
                )
              })}
            </View>
          </View>
        )
      }
      break
    }
    default:
      exhaustiveGuard(props.firstImageType)
  }
}

interface ImagePressableProps {
  index: number
  onPress: (index: number) => void
  media: { type: 'IMAGE'; imageSource: ImageURISource; description?: string }
  className?: string
}
function ImagePressable(props: ImagePressableProps) {
  return (
    <Pressable
      onPress={() => props.onPress(props.index)}
      className={cn(`rounded-[2px] overflow-hidden w-full bg-gray-50`, props.className)}
    >
      <Image
        style={{ width: '100%', height: '100%' }}
        source={props.media.imageSource}
        alt={props.media.description ?? ''}
      />
    </Pressable>
  )
}
