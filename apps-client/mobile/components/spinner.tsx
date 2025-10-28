import { useEffect } from 'react'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { Icon } from '@pple-today/ui/icon'
import { LoaderCircleIcon } from 'lucide-react-native'

export function Spinner() {
  const rotate = useSharedValue(0)
  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 500, easing: Easing.linear }), -1)
  }, [rotate])
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }))
  return (
    <Animated.View style={animatedStyle}>
      <Icon icon={LoaderCircleIcon} className="text-base-primary-default" size={36} />
    </Animated.View>
  )
}
