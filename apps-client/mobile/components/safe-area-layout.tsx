import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function SafeAreaLayout(props: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View className="flex-1 pt-safe">
      <View
        className="absolute top-0 left-0 right-0 bg-base-bg-white z-10"
        style={{ height: insets.top }}
      />
      {props.children}
    </View>
  )
}
