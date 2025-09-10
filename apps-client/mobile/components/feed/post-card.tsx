import * as React from 'react'
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewProps,
} from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TextProps } from 'react-native-svg'
import { createQuery } from 'react-query-kit'

import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { ExtractBodyResponse } from '@pple-today/api-client'
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
  SendIcon,
  TriangleAlertIcon,
} from 'lucide-react-native'
import { z } from 'zod/v4'

import { ApplicationApiSchema } from '@api/backoffice'
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

interface FeedPostItem {
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
  createdAt: Date
  reactions: { type: 'UP_VOTE' | 'DOWN_VOTE'; count: number }[]
  commentCount: number
  post: PostItem

  userReaction: UserReaction
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function AnimatedBackgroundPressable(props: PressableProps) {
  const [isActive, setIsActive] = React.useState(false)
  const progress = useDerivedValue(() =>
    isActive ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 150 })
  )
  const onPressIn = (event: GestureResponderEvent) => {
    setIsActive(true)
    props.onPressIn?.(event)
  }
  const onPressOut = (event: GestureResponderEvent) => {
    setIsActive(false)
    props.onPressOut?.(event)
  }
  const styles = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], ['#FFFFFF', '#F1F5F9']),
    }
  })
  return (
    <AnimatedPressable {...props} onPressIn={onPressIn} onPressOut={onPressOut} style={styles} />
  )
}

export const FeedPostCard = React.memo(function FeedPostCard(props: { feedItem: FeedPostItem }) {
  const router = useRouter()
  const navigateToDetailPage = React.useCallback(() => {
    router.navigate(`/(feed)/${props.feedItem.id}`)
  }, [router, props.feedItem.id])
  // cache initialData of feed item when navigating to detail page
  const feedContentQuery = reactQueryClient.useQuery(
    '/feed/:id',
    { pathParams: { id: props.feedItem.id } },
    // TODO: fix type
    { initialData: props.feedItem as any, enabled: false }
  )
  const feedContent = feedContentQuery.data as FeedPostItem
  return (
    <View className="flex flex-col bg-base-bg-white border border-base-outline-default rounded-2xl overflow-hidden mt-4 mx-4">
      <AnimatedBackgroundPressable
        className="px-4 pt-4 pb-3 flex flex-row items-center justify-between"
        onPress={navigateToDetailPage}
      >
        <View className="flex flex-row items-center">
          {/* TODO: link */}
          <Avatar alt={feedContent.author.name} className="w-8 h-8 mr-3">
            <AvatarImage source={{ uri: feedContent.author.profileImage }} />
            <AvatarPPLEFallback />
          </Avatar>
          <View className="flex flex-col">
            {/* TODO: link */}
            <Text className="text-base-text-medium font-anakotmai-medium text-sm">
              {feedContent.author.name}
            </Text>
            <Text className="text-base-text-medium font-anakotmai-light text-sm">
              {feedContent.author.address ? `${feedContent.author.address.province} | ` : ''}
              {formatDateInterval(feedContent.createdAt.toString())}
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
      </AnimatedBackgroundPressable>
      <View className="flex flex-col gap-3">
        {feedContent.post.attachments && feedContent.post.attachments.length > 0 && (
          <Lightbox attachments={feedContent.post.attachments} />
        )}
        {feedContent.post.content && (
          <AnimatedBackgroundPressable className="px-4" onPress={navigateToDetailPage}>
            <MoreOrLess
              numberOfLines={3}
              moreText="อ่านเพิ่มเติม"
              lessText="แสดงน้อยลง"
              animated
              textComponent={TextPost}
              buttonComponent={ButtonTextPost}
            >
              {feedContent.post.content}
            </MoreOrLess>
          </AnimatedBackgroundPressable>
        )}
        {feedContent.post.hashTags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-1 px-4">
            {feedContent.post.hashTags.map((tag) => (
              // TODO: link
              <Badge variant="secondary" key={tag.id}>
                <Text>{tag.name}</Text>
              </Badge>
            ))}
          </View>
        )}
      </View>
      <AnimatedBackgroundPressable
        className="flex flex-row justify-between items-center px-4 py-3"
        onPress={navigateToDetailPage}
      >
        <FeedReactionHook feedId={feedContent.id} />
        <UpvoteReactionCount feedId={feedContent.id} />
        {feedContent.commentCount > 0 && (
          <Text className="text-xs font-anakotmai-light text-base-text-medium">
            {feedContent.commentCount} ความคิดเห็น
          </Text>
        )}
      </AnimatedBackgroundPressable>
      <View className="flex flex-col">
        <View className="px-4">
          <View className="border-b border-base-outline-default" />
        </View>
        <View className="flex flex-row justify-between gap-2 px-3 pb-2 pt-1">
          <View className="flex flex-row gap-2">
            <UpvoteButton feedId={feedContent.id} />
            <DownvoteButton feedId={feedContent.id} />
          </View>
          <CommentButton feedId={feedContent.id} />
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

interface FeedReaction {
  upvoteCount: number
  downvoteCount: number
  userReaction: UserReaction
}
// create store using react query
export const useFeedReactionQuery = createQuery({
  queryKey: ['feed-reaction'],
  fetcher: (_: { feedId: string }): FeedReaction => {
    throw new Error('PostReactionStore should not be enabled')
  },
  enabled: false,
})

function useFeedReactionValue(feedId: string): FeedReaction {
  const feedReactionQuery = useFeedReactionQuery({ variables: { feedId } })
  return feedReactionQuery.data!
}

function useSetFeedReaction(feedId: string) {
  const queryClient = useQueryClient()
  return React.useCallback(
    (newReaction: UserReaction) => {
      queryClient.setQueryData(
        useFeedReactionQuery.getKey({ feedId }),
        (oldData: FeedReaction | undefined) => {
          if (!oldData) return
          const { upvoteCount, downvoteCount } = getNewReactionCount(
            oldData.userReaction,
            newReaction,
            oldData.upvoteCount,
            oldData.downvoteCount
          )
          return {
            ...oldData,
            userReaction: newReaction,
            upvoteCount,
            downvoteCount,
          }
        }
      )
    },
    [queryClient, feedId]
  )
}

function getNewReactionCount(
  oldReaction: UserReaction,
  newReaction: UserReaction,
  upvoteCount: number,
  downvoteCount: number
) {
  if (newReaction === 'UP_VOTE' && oldReaction !== 'UP_VOTE') {
    upvoteCount += 1
  }
  if (newReaction === 'DOWN_VOTE' && oldReaction !== 'DOWN_VOTE') {
    downvoteCount += 1
  }
  if (newReaction !== 'UP_VOTE' && oldReaction === 'UP_VOTE') {
    upvoteCount -= 1
  }
  if (newReaction !== 'DOWN_VOTE' && oldReaction === 'DOWN_VOTE') {
    downvoteCount -= 1
  }
  return { upvoteCount, downvoteCount }
}

function getFeedReaction(
  data: ExtractBodyResponse<ApplicationApiSchema, 'get', '/feed/:id'>
): FeedReaction {
  const reactions = data.reactions
  const upvoteCount = reactions.find((r) => r.type === 'UP_VOTE')?.count ?? 0
  const downvoteCount = reactions.find((r) => r.type === 'DOWN_VOTE')?.count ?? 0
  const userReaction = data.userReaction
  return { upvoteCount, downvoteCount, userReaction }
}

function FeedReactionHook({ feedId }: { feedId: string }) {
  const feedContentQuery = reactQueryClient.useQuery('/feed/:id', {
    pathParams: { id: feedId },
  })
  // TODO: make sure that this initialData run before render
  useFeedReactionQuery({
    variables: { feedId },
    initialData: () => getFeedReaction(feedContentQuery.data!),
  })
  const queryClient = useQueryClient()
  React.useEffect(() => {
    if (!feedContentQuery.data) return
    queryClient.setQueryData(
      useFeedReactionQuery.getKey({ feedId }),
      getFeedReaction(feedContentQuery.data)
    )
  }, [feedContentQuery.data, queryClient, feedId])
  return null
}

interface UpvoteReactionCountProps {
  feedId: string
}
function UpvoteReactionCount(props: UpvoteReactionCountProps) {
  const { upvoteCount } = useFeedReactionValue(props.feedId)
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon
        icon={HeartHandshakeIcon}
        size={18}
        className="fill-base-primary-medium text-white"
        strokeWidth={1}
      />
      <Text className="text-xs font-anakotmai-light text-base-text-medium">{upvoteCount}</Text>
    </View>
  )
}

function AnimatedButton(props: PressableProps) {
  const [isActive, setIsActive] = React.useState(false)
  const progress = useDerivedValue(() =>
    isActive ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 150 })
  )
  const onPressIn = (event: GestureResponderEvent) => {
    setIsActive(true)
    props.onPressIn?.(event)
  }
  const onPressOut = (event: GestureResponderEvent) => {
    setIsActive(false)
    props.onPressOut?.(event)
  }
  const styles = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [1, 0.5]),
    }
  })
  return (
    <AnimatedPressable
      style={styles}
      className="flex flex-row items-center gap-1 rounded-md py-3 px-1"
      {...props}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    />
  )
}

const LikeAnimationFile = Platform.select({
  ios: require('../../assets/PPLE-Like-Animation.lottie'),
  android: require('../../assets/PPLE-Like-Animation.zip'),
})
interface UpvoteButtonProps {
  feedId: string
}
function UpvoteButton(props: UpvoteButtonProps) {
  const scale = useSharedValue(1)
  const onPressIn = () => {
    scale.value = withSpring(0.7, {
      stiffness: 300,
      damping: 12,
      mass: 1,
      overshootClamping: false,
    })
  }
  const onPressOut = () => {
    scale.value = withSpring(1, {
      stiffness: 300,
      damping: 12,
      mass: 1,
      overshootClamping: false,
    })
  }
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  const likeAnimationRef = React.useRef<LottieView | null>(null)
  const { userReaction } = useFeedReactionValue(props.feedId)
  const setFeedReaction = useSetFeedReaction(props.feedId)
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
        pathParams: { id: props.feedId },
        body: { type: 'UP_VOTE' },
      })
    } else {
      deleteReactionQuery.mutateAsync({
        pathParams: { id: props.feedId },
      })
    }
    // optimistic update
    setFeedReaction(newUserReaction)
  }

  return (
    <AnimatedButton onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <View>
        <Animated.View style={animatedStyle}>
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
    </AnimatedButton>
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
function DownvoteButton(props: { feedId: string }) {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null)
  const onOpen = () => {
    bottomSheetModalRef.current?.present()
  }
  const onClose = () => {
    bottomSheetModalRef.current?.dismiss()
  }

  const { userReaction } = useFeedReactionValue(props.feedId)
  const setFeedReaction = useSetFeedReaction(props.feedId)
  const deleteReactionQuery = reactQueryClient.useMutation('delete', '/feed/:id/reaction')

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
        pathParams: { id: props.feedId },
      })
      // optimistic update
      setFeedReaction(newUserReaction)
    }
  }

  const insets = useSafeAreaInsets()

  return (
    <>
      <AnimatedButton onPress={onPress}>
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
      </AnimatedButton>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        keyboardBehavior="interactive"
        bottomInset={insets.bottom}
      >
        <BottomSheetView>
          <DownvoteCommentForm onClose={onClose} feedId={props.feedId} />
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
  feedId: string
}
function DownvoteCommentForm(props: DownvoteCommentFormProps) {
  const createReactionMutation = reactQueryClient.useMutation('put', '/feed/:id/reaction')
  const queryClient = useQueryClient()
  const { userReaction } = useFeedReactionValue(props.feedId)
  const setFeedReaction = useSetFeedReaction(props.feedId)
  const form = useForm({
    defaultValues: {
      comment: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const comment = value.comment.trim()
      createReactionMutation.mutateAsync(
        {
          pathParams: { id: props.feedId },
          body: { type: 'DOWN_VOTE', comment: comment ? comment : undefined },
        },
        {
          onSuccess: (response) => {
            props.onClose()
            toast({
              text1: 'เพิ่มความคิดเห็นส่วนตัวแล้ว',
              icon: MessageCircleIcon,
            })
            // optimistic update
            const newUserReaction = userReaction === 'DOWN_VOTE' ? null : 'DOWN_VOTE'
            setFeedReaction(newUserReaction)
            // manually update infinite query
            queryClient.setQueryData(
              // TODO fix type
              reactQueryClient.getQueryKey('/feed/:id/comments', {
                pathParams: { id: props.feedId },
              }) as any,
              (old: any) => {
                if (!old) return undefined
                const updatedFirstPage = [response.comment, ...old.pages[0]]
                return {
                  pages: [updatedFirstPage, ...old.pages.slice(1)],
                  pageParams: old.pageParams,
                }
              }
            )
          },
          onError: () => {
            toast.error({
              text1: 'เกิดข้อผิดพลาดบางอย่าง',
              icon: TriangleAlertIcon,
            })
          },
        }
      )
    },
  })
  const onSkip = () => {
    props.onClose()
    createReactionMutation.mutateAsync({
      pathParams: { id: props.feedId },
      body: { type: 'DOWN_VOTE', comment: undefined },
    })
    // optimistic update
    const newUserReaction = userReaction === 'DOWN_VOTE' ? null : 'DOWN_VOTE'
    setFeedReaction(newUserReaction)
  }
  return (
    <View className="flex flex-col flex-1">
      <View className="flex flex-col gap-1 p-4 pb-0">
        <Text className="text-2xl font-anakotmai-bold">ข้อเสนอแนะ</Text>
        <Text className="text-sm font-anakotmai-light">
          {
            'บอกพวกเราทีว่าเหตุใดคุณถึงไม่เห็นด้วย\nความคิดเห็นของคุณจะถูกแสดงเป็นความคิดเห็นส่วนตัว'
          }
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
        <Button variant="ghost" onPress={onSkip} disabled={createReactionMutation.isPending}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </View>
  )
}

function CommentButton(props: { feedId: string }) {
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
      <AnimatedButton onPress={onPress}>
        <Icon icon={MessageCircleIcon} size={20} strokeWidth={1} className="text-base-text-high" />
        <Text className="text-sm font-anakotmai-light text-base-text-high">ความคิดเห็น</Text>
      </AnimatedButton>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        keyboardBehavior="interactive"
        bottomInset={insets.bottom}
        handleComponent={null}
      >
        <BottomSheetView>
          <CommentForm onClose={onClose} feedId={props.feedId} />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

interface CommentFormProps {
  onClose: () => void
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
      const comment = value.comment.trim()
      commentMutation.mutateAsync(
        {
          pathParams: { id: props.feedId },
          body: { content: comment },
        },
        {
          onSuccess: (response) => {
            props.onClose()
            toast({
              text1: 'เพิ่มความคิดเห็นแล้ว',
              icon: MessageCircleIcon,
            })
            // optimistic update
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/feed/:id', { pathParams: { id: props.feedId } }),
              (old) => {
                if (!old) return
                return {
                  ...old,
                  commentCount: old.commentCount + 1,
                }
              }
            )
            // manually update infinite query
            queryClient.setQueryData(
              // TODO fix type
              reactQueryClient.getQueryKey('/feed/:id/comments', {
                pathParams: { id: props.feedId },
              }) as any,
              (old: any) => {
                if (!old) return undefined
                const updatedFirstPage = [response, ...old.pages[0]]
                return {
                  pages: [updatedFirstPage, ...old.pages.slice(1)],
                  pageParams: old.pageParams,
                }
              }
            )
          },
          onError: () => {
            toast.error({
              text1: 'เกิดข้อผิดพลาดบางอย่าง',
              icon: TriangleAlertIcon,
            })
          },
        }
      )
    },
  })
  return (
    <View className="flex flex-row items-end flex-1 bg-base-bg-default p-3 pt-1 gap-2">
      <form.Field name="comment">
        {(field) => (
          <FormItem field={field} className="flex-1">
            <FormLabel className="sr-only">ความคิดเห็น</FormLabel>
            <FormControl>
              <Textarea
                asChild
                className={clsx('min-h-10', Platform.select({ android: 'py-1' }))}
                numberOfLines={1}
                placeholder="พิมพ์ความคิดเห็นของคุณ"
                value={field.state.value}
                onChangeText={field.handleChange}
                textAlignVertical="center"
              >
                <BottomSheetTextInput />
              </Textarea>
            </FormControl>
            <FormMessage className="sr-only" />
          </FormItem>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.values.comment]}>
        {([comment]) =>
          comment.trim() !== '' && (
            <Button size="icon" onPress={form.handleSubmit} disabled={commentMutation.isPending}>
              <Icon icon={SendIcon} strokeWidth={1} />
            </Button>
          )
        }
      </form.Subscribe>
    </View>
  )
}

export const PostContent = (props: { feedItem: FeedPostItem }) => {
  return (
    <View className="flex flex-col bg-base-bg-white">
      <View className="px-4 pt-1 pb-3 flex flex-row items-center justify-between">
        <View className="flex flex-row items-center">
          <Avatar alt={props.feedItem.author.name} className="w-8 h-8 mr-3">
            <AvatarImage source={{ uri: props.feedItem.author.profileImage }} />
            <AvatarPPLEFallback />
          </Avatar>
          <View className="flex flex-col">
            <Text className="text-base-text-medium font-anakotmai-medium text-sm">
              {props.feedItem.author.name}
            </Text>
            <Text className="text-base-text-medium font-anakotmai-light text-sm">
              {props.feedItem.author.address ? `${props.feedItem.author.address.province} | ` : ''}
              {formatDateInterval(props.feedItem.createdAt.toString())}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex flex-col gap-3 pb-3">
        {props.feedItem.post.attachments && props.feedItem.post.attachments.length > 0 && (
          <Lightbox attachments={props.feedItem.post.attachments} />
        )}
        {props.feedItem.post.content && (
          <View className="px-4">
            <TextPost>{props.feedItem.post.content}</TextPost>
          </View>
        )}
        {props.feedItem.post.hashTags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-1 px-4">
            {props.feedItem.post.hashTags.map((tag) => (
              // TODO: link
              <Badge variant="secondary" key={tag.id}>
                <Text>{tag.name}</Text>
              </Badge>
            ))}
          </View>
        )}
      </View>
      <View className="flex flex-row justify-between items-center px-4 pb-3">
        <UpvoteReactionCount feedId={props.feedItem.id} />
        {props.feedItem.commentCount > 0 && (
          <Text className="text-xs font-anakotmai-light text-base-text-medium">
            {props.feedItem.commentCount} ความคิดเห็น
          </Text>
        )}
      </View>
      <View className="flex flex-col">
        <View className="px-4">
          <View className="border-b border-base-outline-default" />
        </View>
        <View className="flex flex-row justify-between gap-2 px-3 pb-2 pt-1">
          <View className="flex flex-row gap-2">
            <UpvoteButton feedId={props.feedItem.id} />
            <DownvoteButton feedId={props.feedItem.id} />
          </View>
          <CommentButton feedId={props.feedItem.id} />
        </View>
      </View>
    </View>
  )
}
