import React from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'

interface PollOptionProps {
  option: string
  votes?: number
  totalVotes?: number
  selected?: boolean
  showResult?: boolean
}

export function PollOption(props: PollOptionProps) {
  const opacity = useSharedValue(1)
  const animatedPercentage = useSharedValue(50)
  const [selected, setSelected] = React.useState(props.selected || false)

  const animatedOpacityStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const animatedBarStyle = useAnimatedStyle(() => ({ width: `${animatedPercentage.value}%` }))

  const onPressIn = () => {
    opacity.value = withTiming(0.5, { duration: 150 })
  }
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: 150 })
  }

  const onPress = () => {
    const newSelected = !selected
    setSelected(newSelected)
    animatedPercentage.value = withTiming(newSelected ? 50 : 0, {
      duration: 500,
    })
  }

  return (
    <Pressable
      className={cn(
        'border border-base-outline-medium rounded-xl overflow-hidden',
        props.selected && 'border-base-primary-default'
      )}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}
    >
      <Animated.View
        style={animatedOpacityStyle}
        className={cn(
          'w-full text-start  flex items-center justify-between bg-base-bg-white flex-row rounded-xl gap-2 relative'
        )}
      >
        <View className="flex flex-row justify-between items-center flex-1 m-3">
          <Text className={cn('flex flex-wrap flex-1', props.selected && 'text-base-primary-dark')}>
            {props.option}
          </Text>
          {(props.selected || props.showResult) && (
            <Text
              className={cn(
                'text-sm font-body-medium',
                props.showResult && 'text-base-text-high',
                props.selected && 'text-base-primary-dark'
              )}
            >
              {50}%
            </Text>
          )}
        </View>
        <Animated.View
          className={cn(
            'absolute top-0 left-0 h-full bg-base-bg-medium z-[-1] rounded-e-xl',
            props.selected && 'bg-base-primary-light'
          )}
          style={animatedBarStyle}
        />
      </Animated.View>
    </Pressable>
  )
}
