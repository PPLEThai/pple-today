import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { Icon } from '@pple-today/ui/icon'
import { LoaderCircleIcon } from 'lucide-react-native'

export default function LoadingPage() {
  const rotate = useSharedValue(0)
  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 500, easing: Easing.linear }), -1)
  }, [rotate])
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }))
  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <Animated.View style={animatedStyle}>
        <Icon icon={LoaderCircleIcon} className="text-base-primary-default" size={36} />
      </Animated.View>
    </View>
  )
}
