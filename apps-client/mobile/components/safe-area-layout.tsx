import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '@pple-today/ui/lib/utils'

export function SafeAreaLayout(props: { children: React.ReactNode; className?: string }) {
  const insets = useSafeAreaInsets()
  return (
    <View className={cn('flex-1 pt-safe', props.className)}>
      <View
        className="absolute top-0 left-0 right-0 bg-base-bg-white z-10"
        style={{ height: insets.top }}
      />
      {props.children}
    </View>
  )
}
