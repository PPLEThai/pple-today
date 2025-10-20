import React from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Checkbox } from '@pple-today/ui/checkbox'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { CheckIcon, MinusIcon } from 'lucide-react-native'

import { FeedItemPoll } from '@api/backoffice/app'

type PollOption = FeedItemPoll['poll']['options'][number]

interface PollOptionProps extends PollOption {
  totalVotes: number
  pollTouched: boolean // if the poll has been interacted with
  onSelect: (id: string) => void
}

// This function will consist only 2 states: selected or not selected
export function PollOptionItem(props: PollOptionProps) {
  const percentage = (props.votes / props.totalVotes) * 100 || 0
  const animatedPercentage = useSharedValue(0)
  const animatedBarStyle = useAnimatedStyle(() => ({ width: `${animatedPercentage.value}%` }))

  // render animation if the options is selected percentage <-> 0
  React.useEffect(() => {
    if (props.isSelected || props.pollTouched) {
      animatedPercentage.value = withTiming(percentage, { duration: 500 })
    } else {
      animatedPercentage.value = withTiming(0, { duration: 500 })
    }
  }, [props.isSelected, percentage, animatedPercentage, props.pollTouched])

  const renderCheckbox = () => {
    return (
      <View
        className={cn(
          'h-4 w-4 rounded-[4px] border border-base-secondary-light',
          props.isSelected && 'bg-base-primary-default border-base-primary-default'
        )}
      >
        {props.isSelected && (
          <Icon icon={CheckIcon} size={14} className="text-base-bg-white" strokeWidth={2} />
        )}
      </View>
    )
  }

  return (
    <Pressable
      className={cn(
        'border border-base-outline-medium rounded-xl overflow-hidden',
        props.isSelected && 'border-base-primary-default'
      )}
      onPress={() => props.onSelect(props.id)}
    >
      <View className="flex flex-row justify-between items-center m-3 gap-2.5">
        {renderCheckbox()}
        <Text className={cn('flex-1 flex-wrap mr-3', props.isSelected && 'text-base-primary-dark')}>
          {props.title}
        </Text>
        {props.pollTouched && (
          <Text
            className={cn(
              'text-sm font-body-medium',
              props.pollTouched && 'text-base-text-high',
              props.isSelected && 'text-base-primary-dark'
            )}
          >
            {percentage}%
          </Text>
        )}
      </View>
      {(props.pollTouched || props.isSelected) && (
        <Animated.View
          className={cn(
            'absolute top-0 left-0 h-full  z-[-1] rounded-r-xl',
            props.pollTouched && 'bg-base-bg-medium',
            props.isSelected && 'bg-base-primary-light'
          )}
          style={animatedBarStyle}
        />
      )}
    </Pressable>
  )
}

interface PollOptionResultProps extends PollOption {
  totalVotes: number
  isSelected: boolean
}

export function PollOptionResult(props: PollOptionResultProps) {
  const percentage = (props.votes / props.totalVotes) * 100 || 0
  const animatedPercentage = useSharedValue(0)
  const animatedBarStyle = useAnimatedStyle(() => ({ width: `${animatedPercentage.value}%` }))

  React.useEffect(() => {
    animatedPercentage.value = withTiming(percentage, { duration: 500 })
  }, [percentage, animatedPercentage])

  const renderCheckbox = () => {
    if (props.isSelected) {
      return (
        <Checkbox
          checked={props.isSelected}
          onCheckedChange={() => {}}
          className={cn(
            'border-base-outline-dark',
            props.isSelected && 'border-base-primary-default'
          )}
        />
      )
    }

    return (
      <View className="h-4 w-4 rounded-[4px] bg-base-secondary-light items-center justify-center">
        <Icon icon={MinusIcon} size={16} className="text-base-bg-white" strokeWidth={2} />
      </View>
    )
  }

  return (
    <View
      className={cn(
        'border border-base-outline-medium rounded-xl overflow-hidden',
        props.isSelected && 'border-base-primary-default'
      )}
      {...props}
    >
      <View className="flex flex-row justify-between items-center m-3 gap-4">
        {renderCheckbox()}
        <Text className={cn('flex-1 flex-wrap mr-3', props.isSelected && 'text-base-primary-dark')}>
          {props.title}
        </Text>
        <Text
          className={cn(
            'text-sm font-body-medium text-base-text-high',
            props.isSelected && 'text-base-primary-dark'
          )}
        >
          {percentage}%
        </Text>
      </View>
      <Animated.View
        className={cn(
          'absolute top-0 left-0 h-full bg-base-bg-medium z-[-1] rounded-r-xl',
          props.isSelected && 'bg-base-primary-light'
        )}
        style={animatedBarStyle}
      />
    </View>
  )
}
