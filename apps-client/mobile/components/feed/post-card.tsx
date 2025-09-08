import * as React from 'react'
import { Platform, Pressable, StyleSheet, View, ViewProps } from 'react-native'
import Animated, { useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TextProps } from 'react-native-svg'
import { createQuery } from 'react-query-kit'

import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { BottomSheetModal, BottomSheetView } from '@pple-today/ui/bottom-sheet/index'
import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { Textarea } from '@pple-today/ui/textarea'
import { toast } from '@pple-today/ui/toast'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import {
  HeartCrackIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  TriangleAlertIcon,
} from 'lucide-react-native'
import { z } from 'zod/v4'

import { MoreOrLess } from '@app/components/more-or-less'
import { reactQueryClient } from '@app/libs/api-client'
import { useSessionQuery } from '@app/libs/auth'
import { formatDateInterval } from '@app/libs/format-date-interval'

import { Lightbox, PostCardAttachment } from './lightbox'

import { AvatarPPLEFallback } from '../avatar-pple-fallback'

type UserReaction = 'UP_VOTE' | 'DOWN_VOTE' | null
interface PostItem {
  content: string
  hashTags: {
    id: string
    name: string
  }[]
  attachments?: PostCardAttachment[]
}
interface PostCardProps {
  id: string
  author: {
    id: string
    name: string
    address?: {
      province: string
      district: string
    }
    profileImage?: string
  }
  createdAt: string
  reactions: { type: 'UP_VOTE' | 'DOWN_VOTE'; count: number }[]
  commentCount: number
  post: PostItem

  userReaction: UserReaction
}

export const PostCard = React.memo(function PostCard(props: PostCardProps) {
  const router = useRouter()
  return (
    <View className="flex flex-col bg-base-bg-white border border-base-outline-default rounded-2xl mt-4 mx-4">
      <View className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
        {/* TODO: link */}
        <View className="flex flex-row items-center">
          {/* TODO: link */}
          <Avatar alt={props.author.name} className="w-8 h-8 mr-3">
            <AvatarImage source={{ uri: props.author.profileImage }} />
            <AvatarPPLEFallback />
          </Avatar>
          <View className="flex flex-col">
            {/* TODO: link */}
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
      <View className="flex flex-col gap-3 pb-3">
        {props.post.attachments && props.post.attachments.length > 0 && (
          <Lightbox attachments={props.post.attachments} />
        )}
        {props.post.content && (
          <View className="px-4">
            <MoreOrLess
              numberOfLines={3}
              moreText="อ่านเพิ่มเติม"
              lessText="แสดงน้อยลง"
              animated
              textComponent={TextPost}
              buttonComponent={ButtonTextPost}
            >
              {props.post.content}
            </MoreOrLess>
          </View>
        )}
        {props.post.hashTags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-1 px-4">
            {props.post.hashTags.map((tag) => (
              // TODO: link
              <Badge variant="secondary" key={tag.id}>
                <Text>{tag.name}</Text>
              </Badge>
            ))}
          </View>
        )}
      </View>
      <Pressable
        className="flex flex-row justify-between items-center px-4 pb-3"
        onPress={() => {
          router.navigate(`/(feed)/${props.id}`)
        }}
      >
        <UpvoteReactionCount
          id={props.id}
          reactions={props.reactions}
          userReaction={props.userReaction}
        />
        {/* TODO: link */}
        {props.commentCount > 0 && (
          <Pressable>
            <Text className="text-xs font-anakotmai-light text-base-text-medium">
              {props.commentCount} ความคิดเห็น
            </Text>
          </Pressable>
        )}
      </Pressable>
      <View className="flex flex-col">
        <View className="px-4">
          <View className="border-b border-base-outline-default" />
        </View>
        <View className="flex flex-row justify-between gap-2 px-3 pb-2 pt-1">
          <View className="flex flex-row gap-2">
            <UpvoteButton postId={props.id} />
            <DownvoteButton postId={props.id} feedId={props.id} />
          </View>
          <CommentButton postId={props.id} feedId={props.id} />
        </View>
      </View>
    </View>
  )
})

export const PostCardSkeleton = (props: ViewProps) => {
  return (
    <View
      className="flex flex-col bg-base-bg-white border border-base-outline-default rounded-2xl mt-4 mx-4"
      {...props}
    >
      <View className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
        <View className="flex flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-base-bg-default flex items-center justify-center mr-3 overflow-hidden" />
          <View className="flex flex-col py-1 gap-2">
            <View className="rounded-md bg-base-bg-default h-[12px] w-[160px]" />
            <View className="rounded-md bg-base-bg-default h-[12px] w-[100px]" />
          </View>
        </View>
      </View>
      <View className="px-4 pb-3">
        <View className="rounded-lg bg-base-bg-default w-full aspect-[2/1]" />
      </View>
      <View className="flex flex-row justify-between items-center px-4 pb-3">
        <View className="rounded-md bg-base-bg-default h-[20px] w-[100px]" />
        <View className="rounded-md bg-base-bg-default h-[20px] w-[100px]" />
      </View>
      <View className="flex flex-col">
        <View className="px-4">
          <View className="border-b border-base-outline-default" />
        </View>
        <View className="flex flex-row justify-between gap-2 px-3 pb-3 pt-3">
          <View className="flex flex-row gap-2">
            <View className="rounded-md bg-base-bg-default h-[32px] w-[100px]" />
            <View className="rounded-md bg-base-bg-default h-[32px] w-[100px]" />
          </View>
          <View className="rounded-md bg-base-bg-default h-[32px] w-[100px]" />
        </View>
      </View>
    </View>
  )
}

function TextPost(props: TextProps) {
  return <Text {...props} className="text-base-text-high font-noto-light text-base" />
}
function ButtonTextPost(props: TextProps) {
  return <Text {...props} className="text-base-primary-default font-noto-light text-base" />
}

interface PostReaction {
  upvoteCount: number
  userReaction: UserReaction
}
// create store using react query
export const usePostReactionStore = createQuery({
  queryKey: ['post-reaction'],
  fetcher: (_: { id: string }): PostReaction => {
    throw new Error('PostReactionStore should not be enabled')
  },
  enabled: false,
})
interface UpvoteReactionCountProps {
  id: string
  reactions: PostCardProps['reactions']
  userReaction: UserReaction | null
}
function UpvoteReactionCount(props: UpvoteReactionCountProps) {
  const initialPostReaction = (): PostReaction => {
    const upvote = props.reactions.find((r) => r.type === 'UP_VOTE')
    return {
      upvoteCount: upvote?.count ?? 0,
      userReaction: props.userReaction,
    }
  }
  const postReactionStore = usePostReactionStore({
    variables: { id: props.id },
    initialData: initialPostReaction,
  })
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon
        icon={HeartHandshakeIcon}
        size={18}
        className="fill-base-primary-medium text-white"
        strokeWidth={1}
      />
      <Text className="text-xs font-anakotmai-light text-base-text-medium">
        {postReactionStore.data.upvoteCount}
      </Text>
    </View>
  )
}

const LikeAnimationFile = Platform.select({
  ios: require('../../assets/PPLE-Like-Animation.lottie'),
  android: require('../../assets/PPLE-Like-Animation.zip'),
})
interface UpvoteButtonProps {
  postId: string
}
function UpvoteButton(props: UpvoteButtonProps) {
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
  const queryClient = useQueryClient()
  const postReactionStore = usePostReactionStore({ variables: { id: props.postId } })
  const userReaction = postReactionStore.data?.userReaction
  const createReactionQuery = reactQueryClient.useMutation('put', '/feed/:id/reaction')
  const deleteReactionQuery = reactQueryClient.useMutation('delete', '/feed/:id/reaction')
  const router = useRouter()
  const sessionQuery = useSessionQuery()
  const onPress = () => {
    if (!sessionQuery.data) {
      return router.push('/profile')
    }
    const newUserReaction = userReaction === 'UP_VOTE' ? null : 'UP_VOTE'
    if (newUserReaction === 'UP_VOTE') {
      // skip some empty frames
      likeAnimationRef.current?.play(8, 30)
      createReactionQuery.mutateAsync({
        pathParams: { id: props.postId },
        body: { type: 'UP_VOTE' },
      })
    } else {
      deleteReactionQuery.mutateAsync({
        pathParams: { id: props.postId },
      })
    }
    // optimistic update
    queryClient.setQueryData(usePostReactionStore.getKey({ id: props.postId }), (old) => {
      if (!old) return
      return {
        upvoteCount: newUserReaction === 'UP_VOTE' ? old.upvoteCount + 1 : old.upvoteCount - 1,
        userReaction: newUserReaction,
      } as const
    })
  }

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View
        style={{ opacity }}
        className="flex flex-row items-center gap-1 rounded-md py-3 px-1"
      >
        <View>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Icon
              icon={HeartHandshakeIcon}
              size={20}
              strokeWidth={1}
              className={clsx(
                userReaction === 'UP_VOTE'
                  ? 'fill-base-primary-medium text-white'
                  : 'text-base-text-high'
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
function DownvoteButton(props: { postId: string; feedId: string }) {
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
  const postReactionStore = usePostReactionStore({ variables: { id: props.postId } })
  const userReaction = postReactionStore.data?.userReaction
  const deleteReactionQuery = reactQueryClient.useMutation('delete', '/feed/:id/reaction')
  const queryClient = useQueryClient()

  const router = useRouter()
  const sessionQuery = useSessionQuery()
  const onPress = () => {
    if (!sessionQuery.data) {
      return router.push('/profile')
    }
    const newUserReaction = userReaction === 'DOWN_VOTE' ? null : 'DOWN_VOTE'
    if (newUserReaction === 'DOWN_VOTE') {
      onOpen()
    } else if (newUserReaction === null) {
      deleteReactionQuery.mutateAsync({
        pathParams: { id: props.postId },
      })
      // optimistic update
      queryClient.setQueryData(usePostReactionStore.getKey({ id: props.postId }), (old) => {
        if (!old) return
        return {
          upvoteCount: old.userReaction === 'UP_VOTE' ? old.upvoteCount - 1 : old.upvoteCount,
          userReaction: newUserReaction,
        } as const
      })
    }
  }

  const insets = useSafeAreaInsets()

  return (
    <>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
        <Animated.View
          style={{ opacity }}
          className="flex flex-row items-center gap-1 rounded-md py-3 px-1"
        >
          <Icon
            icon={HeartCrackIcon}
            size={20}
            strokeWidth={1}
            className={clsx(
              userReaction === 'DOWN_VOTE'
                ? 'fill-base-primary-medium text-white'
                : 'text-base-text-high'
            )}
          />
          <Text className="text-sm font-anakotmai-light text-base-text-high">ไม่เห็นด้วย</Text>
        </Animated.View>
      </Pressable>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        keyboardBehavior="interactive"
        bottomInset={insets.bottom}
      >
        <BottomSheetView>
          <DownvoteCommentForm onClose={onClose} postId={props.postId} feedId={props.feedId} />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const formSchema = z.object({
  comment: z.string().check(z.minLength(1, { error: 'กรุณาพิมพ์ความคิดเห็นของคุณ' })),
})
interface DownvoteCommentFormProps {
  onClose: () => void
  postId: string
  feedId: string
}
function DownvoteCommentForm(props: DownvoteCommentFormProps) {
  const createReactionMutation = reactQueryClient.useMutation('put', '/feed/:id/reaction')
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      comment: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      props.onClose()
      const comment = value.comment.trim()
      createReactionMutation.mutateAsync(
        {
          pathParams: { id: props.postId },
          body: { type: 'DOWN_VOTE', comment: comment ? comment : undefined },
        },
        {
          onSuccess: () => {
            toast({
              text1: 'เพิ่มความคิดเห็นส่วนตัวแล้ว',
              icon: MessageCircleIcon,
            })
          },
          onError: () => {
            toast.error({
              text1: 'เกิดข้อผิดพลาดบางอย่าง',
              icon: TriangleAlertIcon,
            })
          },
        }
      )
      // TODO
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/feed/:id/comments', {
          pathParams: { id: props.feedId },
        }),
      })
      // optimistic update
      queryClient.setQueryData(usePostReactionStore.getKey({ id: props.postId }), (old) => {
        if (!old) return
        return {
          upvoteCount: old.userReaction === 'UP_VOTE' ? old.upvoteCount - 1 : old.upvoteCount,
          userReaction: old.userReaction === 'DOWN_VOTE' ? null : 'DOWN_VOTE',
        } as const
      })
    },
  })
  const onSkip = () => {
    props.onClose()
    createReactionMutation.mutateAsync({
      pathParams: { id: props.postId },
      body: { type: 'DOWN_VOTE', comment: undefined },
    })
    // optimistic update
    queryClient.setQueryData(usePostReactionStore.getKey({ id: props.postId }), (old) => {
      if (!old) return
      return {
        upvoteCount: old.userReaction === 'UP_VOTE' ? old.upvoteCount - 1 : old.upvoteCount,
        userReaction: old.userReaction === 'DOWN_VOTE' ? null : 'DOWN_VOTE',
      } as const
    })
  }
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
        <Button variant="ghost" onPress={onSkip}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </View>
  )
}

function CommentButton(props: { postId: string; feedId: string }) {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null)
  const onOpen = () => {
    bottomSheetModalRef.current?.present()
  }
  const onClose = () => {
    bottomSheetModalRef.current?.dismiss()
  }
  const insets = useSafeAreaInsets()

  const router = useRouter()
  const sessionQuery = useSessionQuery()
  const onPress = () => {
    if (!sessionQuery.data) {
      return router.push('/profile')
    }
    onOpen()
  }
  return (
    <>
      <Pressable className="flex flex-row items-center gap-1 px-1 py-3" onPress={onPress}>
        <Icon icon={MessageCircleIcon} size={20} strokeWidth={1} className="text-base-text-high" />
        <Text className="text-sm font-anakotmai-light text-base-text-high">ความคิดเห็น</Text>
      </Pressable>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        keyboardBehavior="interactive"
        bottomInset={insets.bottom}
      >
        <BottomSheetView>
          <CommentForm onClose={onClose} postId={props.postId} feedId={props.feedId} />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}
interface CommentFormProps {
  onClose: () => void
  postId: string
  feedId: string
}
function CommentForm(props: CommentFormProps) {
  const commentMutation = reactQueryClient.useMutation('post', '/feed/:id/comment')
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      comment: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      props.onClose()
      const comment = value.comment.trim()
      commentMutation.mutateAsync(
        {
          pathParams: { id: props.postId },
          body: { content: comment },
        },
        {
          onSuccess: () => {
            toast({
              text1: 'เพิ่มความคิดเห็นส่วนตัวแล้ว',
              icon: MessageCircleIcon,
            })
          },
          onError: () => {
            toast.error({
              text1: 'เกิดข้อผิดพลาดบางอย่าง',
              icon: TriangleAlertIcon,
            })
          },
        }
      )
      // TODO
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/feed/:id/comments', {
          pathParams: { id: props.feedId },
        }),
      })
      // optimistic update
      queryClient.setQueryData(usePostReactionStore.getKey({ id: props.postId }), (old) => {
        if (!old) return
        return {
          upvoteCount: old.userReaction === 'UP_VOTE' ? old.upvoteCount - 1 : old.upvoteCount,
          userReaction: old.userReaction === 'DOWN_VOTE' ? null : 'DOWN_VOTE',
        } as const
      })
    },
  })
  const onSkip = () => {
    props.onClose()
  }
  return (
    <View className="flex flex-col flex-1">
      <View className="flex flex-col gap-1 p-4 pb-0">
        <Text className="text-2xl font-anakotmai-bold">ข้อเสนอแนะ</Text>
        <Text className="text-sm font-anakotmai-light">
          บอกพวกเราทีว่าเหตุใดคุณถึงไม่เห็นด้วย ความคิดเห็นของคุณจะถูกแสดงเป็นความคิดเห็นส่วนตัว
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
        <Button variant="ghost" onPress={onSkip}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </View>
  )
}

export const PostDetail = (props: PostCardProps) => {
  return (
    <View className="flex flex-col bg-base-bg-white">
      <View className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
        <View className="flex flex-row items-center">
          <Avatar alt={props.author.name} className="w-8 h-8 mr-3">
            <AvatarImage source={{ uri: props.author.profileImage }} />
            <AvatarPPLEFallback />
          </Avatar>
          <View className="flex flex-col">
            <Text className="text-base-text-medium font-anakotmai-medium text-sm">
              {props.author.name}
            </Text>
            <Text className="text-base-text-medium font-anakotmai-light text-sm">
              {props.author.address ? `${props.author.address.province} | ` : ''}
              {formatDateInterval(props.createdAt.toString())}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex flex-col gap-3 pb-3">
        {props.post.attachments && props.post.attachments.length > 0 && (
          <Lightbox attachments={props.post.attachments} />
        )}
        {props.post.content && (
          <View className="px-4">
            <MoreOrLess
              numberOfLines={3}
              moreText="อ่านเพิ่มเติม"
              lessText="แสดงน้อยลง"
              animated
              textComponent={TextPost}
              buttonComponent={ButtonTextPost}
            >
              {props.post.content}
            </MoreOrLess>
          </View>
        )}
        {props.post.hashTags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-1 px-4">
            {props.post.hashTags.map((tag) => (
              // TODO: link
              <Badge variant="secondary" key={tag.id}>
                <Text>{tag.name}</Text>
              </Badge>
            ))}
          </View>
        )}
      </View>
      <View className="flex flex-row justify-between items-center px-4 pb-3">
        <UpvoteReactionCount
          id={props.id}
          reactions={props.reactions}
          userReaction={props.userReaction}
        />
        {props.commentCount > 0 && (
          <Text className="text-xs font-anakotmai-light text-base-text-medium">
            {props.commentCount} ความคิดเห็น
          </Text>
        )}
      </View>
      <View className="flex flex-col">
        <View className="px-4">
          <View className="border-b border-base-outline-default" />
        </View>
        <View className="flex flex-row justify-between gap-2 px-3 pb-2 pt-1">
          <View className="flex flex-row gap-2">
            <UpvoteButton postId={props.id} />
            <DownvoteButton postId={props.id} feedId={props.id} />
          </View>
          <View className="flex flex-row items-center gap-1 px-1 py-3">
            <Icon
              icon={MessageCircleIcon}
              size={20}
              strokeWidth={1}
              className="text-base-text-high"
            />
            <Text className="text-sm font-anakotmai-light text-base-text-high">ความคิดเห็น</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
