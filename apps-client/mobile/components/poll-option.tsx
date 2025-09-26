import { Pressable } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { CheckIcon } from 'lucide-react-native'

interface PollOptionProps {
  option: string
  selected?: boolean
}

export function PollOption(props: PollOptionProps) {
  const opacity = useSharedValue(1)
  const onPressIn = () => {
    opacity.value = withTiming(0.5, { duration: 150 })
  }
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: 150 })
  }
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} {...props}>
      <Animated.View
        style={{ opacity }}
        className={cn(
          'w-full text-start border border-base-outline-default flex items-center justify-between bg-base-bg-white flex-row rounded-xl p-3 gap-2',
          props.selected && 'bg-base-primary-default'
        )}
      >
        <Text className={cn('flex flex-wrap flex-1', props.selected && 'text-base-bg-white')}>
          {props.option}
        </Text>
        {props.selected && (
          <Icon icon={CheckIcon} size={24} strokeWidth={2} className="text-base-bg-light" />
        )}
      </Animated.View>
    </Pressable>
  )
}
