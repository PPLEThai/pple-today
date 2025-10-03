import { View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { MessageSquareHeartIcon } from 'lucide-react-native'

import type { GetTopicsResponse } from '@api/backoffice/app'

import { SearchCard } from './search-card'

interface TopicSearchCardProps {
  id: string
  name: string
}

export function TopicSearchCard(props: TopicSearchCardProps) {
  const router = useRouter()
  return (
    <SearchCard onPress={() => router.navigate(`/(feed)/topic/${props.id}`)}>
      <View className="flex flex-row items-center gap-2 px-4 py-3">
        <View className="h-7 w-7 items-center justify-center">
          <Icon icon={MessageSquareHeartIcon} size={20} className="text-base-primary-default" />
        </View>
        <Text className="font-body-light flex-1 line-clamp-1 mr-3">{props.name}</Text>
      </View>
    </SearchCard>
  )
}
TopicSearchCard.displayName = 'TopicSearchCard'

type HashtagList = GetTopicsResponse[number]['hashTags']

interface TopicSearchBigCardProps {
  id: string
  name: string
  bannerImage?: string
  hashtags: HashtagList
}

export function TopicSearchBigCard(props: TopicSearchBigCardProps) {
  const router = useRouter()

  const renderHashtags = (hashtags: HashtagList) => {
    if (hashtags.length === 0) return null
    if (hashtags.length === 1) {
      return (
        <Badge variant="secondary">
          <Text>{hashtags[0].name}</Text>
        </Badge>
      )
    }

    return (
      <>
        <Badge variant="secondary">
          <Text>{hashtags[0].name}</Text>
        </Badge>
        <Badge variant="secondary">
          <Text>{hashtags.length > 1 ? `#อื่น ๆ (${hashtags.length - 1})` : ''}</Text>
        </Badge>
      </>
    )
  }

  return (
    <SearchCard onPress={() => router.navigate(`/(feed)/topic/${props.id}`)}>
      <View className="flex flex-row items-center gap-4 px-4 py-3">
        <Image
          source={{
            uri: props.bannerImage,
          }}
          contentFit="cover"
          style={{ width: 80, height: 80, borderRadius: 12 }}
          transition={300}
          className="bg-base-bg-default min-h-10"
        />
        <View className="flex-1 flex flex-col gap-2 h-full">
          <Text className="font-heading-semibold text-base text-base-text-high">{props.name}</Text>
          <View className="flex flex-row gap-2 mb-0.5 flex-wrap min-h-5">
            {renderHashtags(props.hashtags)}
          </View>
        </View>
      </View>
    </SearchCard>
  )
}
TopicSearchBigCard.displayName = 'TopicSearchBigCard'
