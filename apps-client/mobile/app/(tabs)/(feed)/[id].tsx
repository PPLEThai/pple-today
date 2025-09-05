import { FlatList, Pressable, View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { usePathname, useRouter } from 'expo-router'
import { ArrowLeftIcon, EyeOffIcon } from 'lucide-react-native'

import { GetFeedContentResponse } from '@api/backoffice/src/modules/feed/models'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { PostDetail } from '@app/components/feed/post-card'
import { reactQueryClient } from '@app/libs/api-client'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { formatDateInterval } from '@app/libs/format-date-interval'

export default function FeedDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const feedId = pathname.split('/').at(-1)
  const feedQuery = reactQueryClient.useQuery('/feed/:id', {
    pathParams: { id: feedId! },
    enabled: !!feedId,
  })
  if (!feedId) {
    router.replace('/(feed)')
    return null
  }
  if (feedQuery.isLoading || !feedQuery.data) {
    return null
  }
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="pt-4 px-4 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      <FeedItemDetail item={feedQuery.data} />
      <FeedComment feedId={feedId} />
    </View>
  )
}

function FeedItemDetail({ item }: { item: GetFeedContentResponse }) {
  switch (item.type) {
    case 'POST':
      return (
        <PostDetail
          key={item.id}
          id={item.id}
          author={item.author}
          commentCount={item.commentCount}
          createdAt={item.createdAt.toString()}
          reactions={item.reactions}
          userReaction={item.userReaction}
          post={item.post}
        />
      )
    case 'POLL':
      // TODO: poll feed
      return null
    case 'ANNOUNCEMENT':
      // expected no announcement
      return null
    default:
      return exhaustiveGuard(item)
  }
}

function FeedComment({ feedId }: { feedId: string }) {
  // TODO: infinite query
  const commentsQuery = reactQueryClient.useQuery('/feed/:id/comments', {
    pathParams: { id: feedId },
    query: { page: 1, limit: 20 },
  })
  return (
    <FlatList
      data={commentsQuery.data ?? []}
      contentContainerClassName="px-4 py-2"
      ListFooterComponent={
        <View className="flex flex-col gap-3 mt-3">
          <View className="flex flex-row gap-2">
            <View className="w-8 h-8 bg-base-bg-medium rounded-full" />
            <View className="flex flex-col flex-1 gap-1">
              <View className="flex flex-col gap-1 rounded-2xl w-[200px] bg-base-bg-medium h-16" />
              <View className="h-3 mt-1 rounded-full bg-base-bg-medium w-[60px]" />
            </View>
          </View>
          <View className="flex flex-row gap-2">
            <View className="w-8 h-8 bg-base-bg-medium rounded-full" />
            <View className="flex flex-col flex-1 gap-1 w-full">
              <View className="flex flex-col gap-1 rounded-2xl bg-base-bg-medium h-20" />
              <View className="h-3 mt-1 rounded-full bg-base-bg-medium w-[60px]" />
            </View>
          </View>
          <View className="flex flex-row gap-2">
            <View className="w-8 h-8 bg-base-bg-medium rounded-full" />
            <View className="flex flex-col flex-1 gap-1 w-[100px]">
              <View className="flex flex-col gap-1 rounded-2xl w-[160px] bg-base-bg-medium h-12" />
              <View className="h-3 mt-1 rounded-full bg-base-bg-medium w-[60px]" />
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View className="flex flex-row gap-2 mt-3">
          {/* TODO: Link */}
          <Avatar alt={item.author.name} className="w-8 h-8">
            <AvatarImage source={{ uri: item.author.profileImage }} />
            <AvatarPPLEFallback />
          </Avatar>
          <View className="flex flex-col gap-1">
            {/* TODO: if isPrivate clickable */}
            <Pressable
              className={clsx(
                'flex flex-col gap-1 rounded-2xl border px-3 py-2',
                item.isPrivate
                  ? 'bg-base-bg-medium border-base-outline-medium'
                  : 'bg-base-bg-white border-base-outline-default'
              )}
            >
              <View className="flex flex-row justify-between gap-2 items-center">
                <Text className="font-anakotmai-medium text-base-text-high text-xs">
                  {item.author.name}
                </Text>
                {item.isPrivate && (
                  <Icon icon={EyeOffIcon} size={16} className="text-base-secondary-light" />
                )}
              </View>
              <Text className="font-noto-light text-base-text-high text-sm">{item.content}</Text>
            </Pressable>
            <Text className="font-anakotmai-light text-base-text-medium text-xs">
              {formatDateInterval(item.createdAt.toString())}
            </Text>
          </View>
        </View>
      )}
    />
  )
}
