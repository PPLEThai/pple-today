import * as React from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import ImageView from 'react-native-image-viewing'
import Animated, { useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TextProps } from 'react-native-svg'

import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { Badge } from '@pple-today/ui/badge'
import { BottomSheetModal, BottomSheetView } from '@pple-today/ui/bottom-sheet/index'
import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { clsx, cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { Textarea } from '@pple-today/ui/textarea'
import { toast } from '@pple-today/ui/toast'
import { useForm } from '@tanstack/react-form'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import LottieView from 'lottie-react-native'
import { HeartCrackIcon, HeartHandshakeIcon, MessageCircleIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { MoreOrLess } from '@app/components/more-or-less'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

interface Attachment {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  description?: string
}
interface PostCardProps {
  author: {
    id: string
    name: string
    address?: {
      province: string
      district: string
    }
    profileImage?: string
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
  attachments: Attachment[]
  firstImageType: 'landscape' | 'portrait' | 'square'
}

export const PostCard = React.memo(function PostCard(props: PostCardProps) {
  const upvoteReaction = props.reactions.find((r) => r.type === 'UP_VOTE') ?? {
    type: 'UP_VOTE',
    count: 0,
  }

  return (
    <View className="flex flex-col gap-3 p-4 bg-base-bg-white border border-base-outline-default rounded-2xl mt-4 mx-4">
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
              {props.author.address ? `${props.author.address.province} | ` : ''}
              {formatDateInterval(props.createdAt)}
            </Text>
          </View>
        </View>
        {/* <Button variant="ghost" size="icon" aria-label="Share">
          <Icon
            icon={Share2Icon}
            width={16}
            height={16}
            className="text-base-text-high"
            strokeWidth={1}
          />
        </Button> */}
      </View>
      {props.attachments.length > 0 && (
        <Lightbox attachments={props.attachments} firstImageType={props.firstImageType} />
      )}
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
        {/* TODO: comment count */}
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
            <UpvoteButton />
            <DownvoteButton />
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
  attachments: Attachment[]
  firstImageType: 'landscape' | 'portrait' | 'square'
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
      <AlbumLayout
        firstImageType={props.firstImageType}
        attachments={props.attachments}
        onPress={onPress}
      />
      <ImageView
        images={props.attachments.map((m) => ({ uri: m.url }))}
        imageIndex={imageIndex}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
      />
    </View>
  )
}

// TODO: first pic dimension
interface AttachmentLayoutProps {
  firstImageType: 'landscape' | 'portrait' | 'square'
  attachments: Attachment[]
  onPress: (index: number) => void
}
function AlbumLayout(props: AttachmentLayoutProps) {
  switch (props.firstImageType) {
    case 'landscape': {
      if (props.attachments.length === 1) {
        return (
          <AttachmentPressable
            index={0}
            onPress={props.onPress}
            attachment={props.attachments[0]!}
            className="aspect-[3/2]"
          />
        )
      } else if (props.attachments.length === 2) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            {props.attachments.map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-1"
              />
            ))}
          </View>
        )
      } else if (props.attachments.length === 3) {
        return (
          <View className="flex flex-col gap-0.5 aspect-square">
            {props.attachments.slice(0, 1).map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-1"
              />
            ))}
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(1).map((m, i) => (
                <AttachmentPressable
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
          <View className="flex flex-col gap-0.5 aspect-square">
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(0, 2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  attachment={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i + 2}
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
          <View className="flex flex-col gap-0.5 aspect-square">
            {props.attachments.slice(0, 1).map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-[2]"
              />
            ))}
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(1, 4).map((m, i) => {
                if (i === 2) {
                  return (
                    <View key={i} className="flex-1 relative">
                      <AttachmentPressable
                        key={i}
                        index={i + 1}
                        onPress={props.onPress}
                        attachment={m}
                      />
                      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] pointer-events-none">
                        <Text className="text-2xl text-white font-anakotmai-medium">
                          +{props.attachments.length - 4}
                        </Text>
                      </View>
                    </View>
                  )
                }
                return (
                  <AttachmentPressable
                    key={i}
                    index={i + 1}
                    onPress={props.onPress}
                    attachment={m}
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
      if (props.attachments.length === 1) {
        return (
          <AttachmentPressable
            index={0}
            onPress={props.onPress}
            attachment={props.attachments[0]!}
            className="aspect-[3/4]"
          />
        )
      } else if (props.attachments.length === 2) {
        return (
          <View className="flex flex-row gap-0.5 aspect-[5/4]">
            {props.attachments.map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-1"
              />
            ))}
          </View>
        )
      } else if (props.attachments.length === 3) {
        return (
          <View className="flex flex-row gap-0.5 aspect-square">
            {props.attachments.slice(0, 1).map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-1"
              />
            ))}
            <View className="flex flex-col gap-0.5 flex-1">
              {props.attachments.slice(1).map((m, i) => (
                <AttachmentPressable
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
          <View className="flex flex-col gap-0.5 aspect-square">
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(0, 2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  attachment={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i + 2}
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
          <View className="flex flex-row gap-0.5 aspect-square">
            {props.attachments.slice(0, 1).map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-[2]"
              />
            ))}
            <View className="flex flex-col gap-0.5 flex-1">
              {props.attachments.slice(1, 4).map((m, i) => {
                if (i === 2) {
                  return (
                    <View key={i} className="flex-1 relative">
                      <AttachmentPressable
                        key={i}
                        index={i + 1}
                        onPress={props.onPress}
                        attachment={m}
                      />
                      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] pointer-events-none">
                        <Text className="text-2xl text-white font-anakotmai-medium">
                          +{props.attachments.length - 4}
                        </Text>
                      </View>
                    </View>
                  )
                }
                return (
                  <AttachmentPressable
                    key={i}
                    index={i + 1}
                    onPress={props.onPress}
                    attachment={m}
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
      if (props.attachments.length === 1) {
        return (
          <AttachmentPressable
            index={0}
            onPress={props.onPress}
            attachment={props.attachments[0]!}
            className="aspect-square"
          />
        )
      } else if (props.attachments.length === 2) {
        return (
          <View className="flex flex-row gap-0.5 aspect-[2/1]">
            {props.attachments.map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-1"
              />
            ))}
          </View>
        )
      } else if (props.attachments.length === 3) {
        return (
          <View className="flex flex-row gap-0.5 aspect-[2/1]">
            {props.attachments.slice(0, 1).map((m, i) => (
              <AttachmentPressable
                key={i}
                index={i}
                onPress={props.onPress}
                attachment={m}
                className="flex-1"
              />
            ))}
            <View className="flex flex-col gap-0.5 flex-1">
              {props.attachments.slice(1).map((m, i) => (
                <AttachmentPressable
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
          <View className="flex flex-col gap-0.5 aspect-square">
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(0, 2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  attachment={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-row gap-0.5 flex-1">
              {props.attachments.slice(2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i + 2}
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
          <View className="flex flex-row gap-0.5 aspect-square">
            <View className="flex flex-col gap-0.5 flex-1">
              {props.attachments.slice(0, 2).map((m, i) => (
                <AttachmentPressable
                  key={i}
                  index={i}
                  onPress={props.onPress}
                  attachment={m}
                  className="flex-1"
                />
              ))}
            </View>
            <View className="flex flex-col gap-0.5 flex-1">
              {props.attachments.slice(2, 4).map((m, i) => {
                if (i === 1) {
                  return (
                    <View key={i} className="flex-1 relative">
                      <AttachmentPressable
                        key={i}
                        index={i + 2}
                        onPress={props.onPress}
                        attachment={m}
                      />
                      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1] rounded-[2px] pointer-events-none">
                        <Text className="text-2xl text-white font-anakotmai-medium">
                          +{props.attachments.length - 4}
                        </Text>
                      </View>
                    </View>
                  )
                }
                return (
                  <AttachmentPressable
                    key={i}
                    index={i + 1}
                    onPress={props.onPress}
                    attachment={m}
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

interface AttachmentPressableProps {
  index: number
  onPress: (index: number) => void
  attachment: Attachment
  className?: string
}
function AttachmentPressable(props: AttachmentPressableProps) {
  if (props.attachment.type === 'VIDEO') {
    return (
      <View className={cn(`rounded-[2px] overflow-hidden w-full bg-gray-50`, props.className)}>
        <VideoComp url={props.attachment.url} />
      </View>
    )
  }
  if (props.attachment.type === 'IMAGE') {
    return (
      <Pressable
        onPress={() => props.onPress(props.index)}
        className={cn(`rounded-[2px] overflow-hidden w-full bg-gray-50`, props.className)}
      >
        <Image
          style={{ width: '100%', height: '100%' }}
          source={{ uri: props.attachment.url }}
          alt={props.attachment.description ?? ''}
        />
      </Pressable>
    )
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

const LikeAnimationFile = Platform.select({
  ios: require('../../assets/PPLE-Like-Animation.lottie'),
  android: require('../../assets/PPLE-Like-Animation.zip'),
})

function UpvoteButton() {
  const [upvoted, setUpvoted] = React.useState(false)

  const opacity = useSharedValue(1)
  const scale = useSharedValue(1)

  const onPressIn = () => {
    opacity.value = withTiming(0.5, { duration: 150 })
    scale.value = withSpring(0.7, {
      stiffness: 300,
      damping: 12,
      mass: 1,
      overshootClamping: false,
    })
  }
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: 150 })
    scale.value = withSpring(1, {
      stiffness: 300,
      damping: 12,
      mass: 1,
      overshootClamping: false,
    })
  }

  const likeAnimationRef = React.useRef<LottieView | null>(null)
  const onPress = () => {
    const isUpvoted = !upvoted
    setUpvoted(isUpvoted)
    if (isUpvoted) {
      // skip some empty frames
      likeAnimationRef.current?.play(8, 30)
    }
  }

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={{ opacity }} className="flex flex-row items-center gap-1 rounded-md">
        <View>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Icon
              icon={HeartHandshakeIcon}
              size={20}
              strokeWidth={1}
              className={clsx(
                upvoted ? 'fill-base-primary-medium text-white' : 'text-base-text-high'
              )}
            />
          </Animated.View>
          <LottieView
            containerStyle={[StyleSheet.absoluteFill, styles.lottieContainer]}
            ref={likeAnimationRef}
            source={LikeAnimationFile}
            loop={false}
            style={{ width: 100, height: 100 }}
          />
        </View>
        <Text className="text-sm font-anakotmai-light text-base-text-high">เห็นด้วย</Text>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  lottieContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
})

const formSchema = z.object({
  comment: z.string().check(z.minLength(1, { error: 'กรุณาพิมพ์ความคิดเห็นของคุณ' })),
})
function DownvoteButton() {
  const opacity = useSharedValue(1)

  const onPressIn = () => {
    opacity.value = withTiming(0.5, { duration: 150 })
  }
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: 150 })
  }
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null)

  const onOpen = () => {
    bottomSheetModalRef.current?.present()
  }
  const onClose = () => {
    bottomSheetModalRef.current?.dismiss()
  }
  const insets = useSafeAreaInsets()
  return (
    <View className="flex flex-col gap-2">
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onOpen}>
        <Animated.View style={{ opacity }} className="flex flex-row items-center gap-1 rounded-md">
          <Icon icon={HeartCrackIcon} size={20} strokeWidth={1} className="text-base-text-high" />
          <Text className="text-sm font-anakotmai-light text-base-text-high">ไม่เห็นด้วย</Text>
        </Animated.View>
      </Pressable>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        keyboardBehavior="interactive"
        bottomInset={insets.bottom}
      >
        <BottomSheetView>
          <CommentForm onClose={onClose} />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  )
}

function CommentForm(props: { onClose: () => void }) {
  const form = useForm({
    defaultValues: {
      comment: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      console.log('Form submitted:', values)
      // Simulate a network request
      await new Promise((resolve) => setTimeout(resolve, 500))
      props.onClose()
      toast({
        text1: 'เพิ่มความคิดเห็นส่วนตัวแล้ว',
        icon: MessageCircleIcon,
      })
    },
  })
  return (
    <View className="flex flex-col flex-1">
      <View className="flex flex-col gap-1 p-4 pb-0">
        <Text className="text-2xl font-anakotmai-bold">เหตุใดคุณถึงไม่เห็นด้วย</Text>
        <Text className="text-sm font-anakotmai-light">
          ความคิดเห็นของคุณจะถูกซ่อนจากสาธารณะ หากต้องการให้แสดงต่อสาธารณะกรุณา กด “ความคิดเห็น”
        </Text>
      </View>
      <form.Field name="comment">
        {(field) => (
          <FormItem field={field} className="p-4">
            <FormLabel style={[StyleSheet.absoluteFill, { opacity: 0, pointerEvents: 'none' }]}>
              ความคิดเห็น
            </FormLabel>
            <FormControl>
              <Textarea
                asChild
                placeholder="พิมพ์ความคิดเห็นของคุณ"
                value={field.state.value}
                onChangeText={field.handleChange}
              >
                <BottomSheetTextInput />
              </Textarea>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      </form.Field>
      <View className="flex flex-col gap-2 px-4">
        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button onPress={form.handleSubmit} disabled={isSubmitting}>
              <Text>แสดงความคิดเห็น</Text>
            </Button>
          )}
        </form.Subscribe>
        <Button variant="ghost" onPress={props.onClose}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </View>
  )
}
