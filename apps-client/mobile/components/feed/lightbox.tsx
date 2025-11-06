import * as React from 'react'
import { Pressable, View } from 'react-native'
import ImageView from 'react-native-image-viewing'

import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'

import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { createImageUrl } from '@app/utils/image'

export interface PostCardAttachment {
  id: string
  type: 'IMAGE' | 'VIDEO' | 'AUDIO'
  url: string
  description?: string
}
interface LightboxProps {
  attachments: PostCardAttachment[]
}
export function Lightbox(props: LightboxProps) {
  const [visible, setIsVisible] = React.useState(false)
  const [imageIndex, setImageIndex] = React.useState(0)
  const onPress = (index: number) => {
    setImageIndex(index)
    setIsVisible(true)
  }
  return (
    <View className="px-4">
      <View className="rounded-lg overflow-hidden">
        <AlbumLayout attachments={props.attachments} onPress={onPress} />
      </View>
      <ImageView
        images={props.attachments.map((m) => ({
          uri: createImageUrl(m.url, {
            width: 1080,
            height: 1920,
          }),
        }))}
        imageIndex={imageIndex}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
      />
    </View>
  )
}

// TODO: first pic dimension
interface AttachmentLayoutProps {
  attachments: PostCardAttachment[]
  onPress: (index: number) => void
}
function AlbumLayout(props: AttachmentLayoutProps) {
  if (props.attachments.length === 1) {
    return (
      <Attachment
        index={0}
        onPress={props.onPress}
        attachment={props.attachments[0]!}
        className="aspect-square"
      />
    )
  } else if (props.attachments.length === 2) {
    return (
      <View className="flex flex-row gap-0.5">
        {props.attachments.map((m, i) => (
          <Attachment
            key={i}
            index={i}
            onPress={props.onPress}
            attachment={m}
            className="flex-1 aspect-square"
          />
        ))}
      </View>
    )
  } else if (props.attachments.length === 3) {
    return (
      <View className="flex flex-row gap-0.5">
        {props.attachments.slice(0, 1).map((m, i) => (
          <Attachment
            key={i}
            index={i}
            onPress={props.onPress}
            attachment={m}
            className="flex-[2] aspect-square"
          />
        ))}
        <View className="flex flex-col gap-0.5 flex-1">
          {props.attachments.slice(1).map((m, i) => (
            <Attachment
              key={i}
              index={i + 1}
              onPress={props.onPress}
              attachment={m}
              className="flex-1"
            />
          ))}
        </View>
      </View>
    )
  } else if (props.attachments.length === 4) {
    return (
      <View className="flex flex-row gap-0.5">
        {props.attachments.slice(0, 1).map((m, i) => (
          <Attachment
            key={i}
            index={i}
            onPress={props.onPress}
            attachment={m}
            className="flex-[3] aspect-square"
          />
        ))}
        <View className="flex flex-col gap-0.5 flex-1">
          {props.attachments.slice(1).map((m, i) => (
            <Attachment
              key={i}
              index={i + 1}
              onPress={props.onPress}
              attachment={m}
              className="flex-1"
            />
          ))}
        </View>
      </View>
    )
  } else if (props.attachments.length > 4) {
    return (
      <View className="flex flex-row gap-0.5">
        {props.attachments.slice(0, 1).map((m, i) => (
          <Attachment
            key={i}
            index={i}
            onPress={props.onPress}
            attachment={m}
            className="flex-[3] aspect-square"
          />
        ))}
        <View className="flex flex-col gap-0.5 flex-1">
          {props.attachments.slice(1, 4).map((m, i) => {
            if (i === 2) {
              return (
                <View key={i} className="relative">
                  <Attachment key={i} index={i + 1} onPress={props.onPress} attachment={m} />
                  <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] rounded-[2px] pointer-events-none">
                    <Text className="text-2xl text-white font-heading-semibold">
                      +{props.attachments.length - 4}
                    </Text>
                  </View>
                </View>
              )
            }
            return <Attachment key={i} index={i + 1} onPress={props.onPress} attachment={m} />
          })}
        </View>
      </View>
    )
  }
}

interface AttachmentProps {
  index: number
  onPress: (index: number) => void
  attachment: PostCardAttachment
  className?: string
}
function Attachment(props: AttachmentProps) {
  switch (props.attachment.type) {
    case 'VIDEO':
      return (
        <View className={cn(`rounded-[2px] overflow-hidden w-full bg-gray-50`, props.className)}>
          <VideoComp url={props.attachment.url} />
        </View>
      )
    case 'IMAGE':
      return (
        <Pressable
          onPress={() => props.onPress(props.index)}
          className={cn(`rounded-[2px] overflow-hidden w-full bg-gray-50`, props.className)}
        >
          <Image
            style={{ width: '100%', height: '100%' }}
            source={{
              uri: createImageUrl(props.attachment.url, {
                width: 1000,
                height: 1000,
              }),
            }}
            alt={props.attachment.description ?? ''}
            contentPosition="top center"
          />
        </Pressable>
      )
    case 'AUDIO':
      throw new Error('Unsupported attachment type')
    default:
      exhaustiveGuard(props.attachment.type)
  }
}

// TODO: always open full screen to lightbox
// TODO: this should only display thumbnail of the clip
function VideoComp(props: { url: string }) {
  const player = useVideoPlayer(props.url, (player) => {
    player.loop = true
    // player.play()
  })
  // const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  return (
    <VideoView
      style={{ width: '100%', height: '100%' }}
      player={player}
      allowsFullscreen
      contentFit="cover"
    />
  )
}
