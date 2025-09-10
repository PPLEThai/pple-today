import React from 'react'
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated'

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function AnimatedBackgroundPressable(props: PressableProps) {
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
