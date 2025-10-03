import { View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { SearchIcon } from 'lucide-react-native'

import { SearchCard } from './search-card'

interface QueryCardProps {
  query: string
}

export function QuerySearchCard(props: QueryCardProps) {
  return (
    <SearchCard href={''}>
      <View className="flex flex-row items-center gap-2  px-4 py-3">
        <View className="h-7 w-7 items-center justify-center">
          <Icon icon={SearchIcon} size={20} className="text-base-text-high" />
        </View>
        <Text className="font-body-light flex-1 line-clamp-1 mr-3">{props.query}</Text>
      </View>
    </SearchCard>
  )
}
QuerySearchCard.displayName = 'QuerySearchCard'
