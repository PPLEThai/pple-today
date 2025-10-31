import React from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group'
import { CheckIcon, MinusIcon } from 'lucide-react-native'

import { FeedItemPoll } from '@api/backoffice/app'

type PollOption = FeedItemPoll['poll']['options'][number]

const PollOptionCheckbox = ({ isSelected }: { isSelected: boolean }) => {
  return (
    <View
      className={cn(
        'h-4 w-4 rounded-[4px] border border-base-secondary-light',
        isSelected && 'bg-base-primary-default border-base-primary-default'
      )}
    >
      {isSelected && (
        <Icon icon={CheckIcon} size={14} className="text-base-bg-white" strokeWidth={2} />
      )}
    </View>
  )
}

interface PollOptionResultProps extends PollOption {
  totalVotes: number
}

export const PollOptionResult = React.memo(function PollOptionResult(props: PollOptionResultProps) {
  const percentage = (props.votes / props.totalVotes) * 100 || 0
  const animatedPercentage = useSharedValue(0)
  const animatedBarStyle = useAnimatedStyle(() => ({ width: `${animatedPercentage.value}%` }))

  React.useEffect(() => {
    animatedPercentage.value = withTiming(percentage, { duration: 500 })
  }, [percentage, animatedPercentage])

  return (
    <View
      className={cn(
        'border border-base-outline-medium rounded-xl overflow-hidden',
        props.isSelected && 'border-base-primary-default'
      )}
    >
      <View className="flex flex-row justify-between items-center m-3 gap-2.5">
        <PollResultCheckbox isSelected={props.isSelected} />
        <Text
          className={cn(
            'flex-1 flex-wrap mr-2 font-body-regular text-sm text-base-text-high',
            props.isSelected && 'text-base-primary-dark'
          )}
        >
          {props.title}
        </Text>
        <Text
          className={cn(
            'text-sm font-body-medium text-base-text-high',
            props.isSelected && 'text-base-primary-dark'
          )}
        >
          {Math.trunc(percentage)}%
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
})

const PollResultCheckbox = ({ isSelected }: { isSelected: boolean }) => {
  if (isSelected) {
    return (
      <View
        className={cn(
          'h-4 w-4 rounded-[4px] border bg-base-primary-default border-base-primary-default'
        )}
      >
        <Icon icon={CheckIcon} size={14} className="text-base-bg-white" strokeWidth={2} />
      </View>
    )
  }

  return (
    <View className="h-4 w-4 rounded-[4px] bg-base-secondary-light items-center justify-center">
      <Icon icon={MinusIcon} size={16} className="text-base-bg-white" strokeWidth={2} />
    </View>
  )
}

export function PollOptionGroup({
  className,
  children,
  ...props
}: ToggleGroupPrimitive.RootProps & {
  ref?: React.RefObject<ToggleGroupPrimitive.RootRef>
}) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn('flex flex-row items-center justify-center gap-2', className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  )
}

export const PollOptionItem = React.memo(function PollOptionItem({
  className,
  ...props
}: ToggleGroupPrimitive.ItemProps &
  PollOption & {
    totalVotes: number
    pollTouched: boolean
    ref?: React.RefObject<ToggleGroupPrimitive.ItemRef>
  }) {
  const { value } = ToggleGroupPrimitive.useRootContext()
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

  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        'items-center justify-center rounded-xl active:bg-muted w-full overflow-hidden border bg-base-bg-white border-base-outline-medium',
        ToggleGroupPrimitive.utils.getIsSelected(value, props.value) &&
          'border-base-primary-default',
        className
      )}
      {...props}
    >
      <View className="flex flex-row items-center w-full gap-2 p-3">
        <View className="gap-2.5 flex flex-row items-center shrink-0 flex-1">
          <PollOptionCheckbox
            isSelected={ToggleGroupPrimitive.utils.getIsSelected(value, props.value)}
          />
          <Text
            className={cn(
              'text-sm font-body-regular flex-1 flex-wrap text-base-text-high',
              ToggleGroupPrimitive.utils.getIsSelected(value, props.value) &&
                'text-base-primary-dark'
            )}
          >
            {props.title}
          </Text>
        </View>
        {props.pollTouched && (
          <Text
            className={cn(
              'text-sm font-body-medium text-base-text-high',
              ToggleGroupPrimitive.utils.getIsSelected(value, props.value) &&
                'text-base-primary-dark'
            )}
          >
            {Math.trunc(percentage)}%
          </Text>
        )}
      </View>
      {props.pollTouched && (
        <Animated.View
          className={cn(
            'absolute top-0 left-0 z-[-1] rounded-r-xl h-full',
            props.pollTouched && 'bg-base-bg-medium',
            ToggleGroupPrimitive.utils.getIsSelected(value, props.value) && 'bg-base-primary-light'
          )}
          style={animatedBarStyle}
        />
      )}
    </ToggleGroupPrimitive.Item>
  )
})
