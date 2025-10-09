import { View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Text } from '@pple-today/ui/text'
import { useRouter } from 'expo-router'

import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'

import { SearchCard } from './search-card'

interface UserSearchCardProps {
  id: string
  name: string
  profileImage?: string
}

export function UserSearchCard(props: UserSearchCardProps) {
  const router = useRouter()

  return (
    <SearchCard onPress={() => router.navigate(`/(feed)/(profile)/users/${props.id}`)}>
      <View className="flex flex-row items-center gap-2 px-4 py-3">
        <Avatar className="w-8 h-8" alt={props.name}>
          <AvatarImage
            source={{
              uri: props.profileImage,
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
        <Text className="font-body-light flex-1 line-clamp-1">{props.name}</Text>
      </View>
    </SearchCard>
  )
}
UserSearchCard.displayName = 'UserSearchCard'
