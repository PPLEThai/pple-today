import { Text, View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { HashIcon } from 'lucide-react-native'

import { SearchCard } from './search-card'

interface UserSearchCardProps {
  id: string
  name: string
}

export function HashtagSearchCard(props: UserSearchCardProps) {
  return (
    <SearchCard href={''}>
      <View className="flex flex-row items-center gap-2 px-4 py-3">
        <View className="w-8 h-8 items-center justify-center bg-base-bg-light border border-base-outline-default rounded-full">
          <Icon icon={HashIcon} size={20} className="text-base-primary-default" />
        </View>
        <Text className="font-body-light flex-1 line-clamp-1">{props.name}</Text>
      </View>
    </SearchCard>
  )
}
HashtagSearchCard.displayName = 'HashtagSearchCard'
