import React from 'react'
import { Pressable, View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { useDebouncedCallback } from '@tanstack/react-pacer'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { ChevronRightIcon, Clock3Icon, MessageCircleQuestionIcon } from 'lucide-react-native'

import type { FeedItemPoll } from '@api/backoffice/app'
import { reactQueryClient } from '@app/libs/api-client'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { formatTimeInterval } from '@app/libs/format-time-interval'

import { PollOptionGroup, PollOptionItem, PollOptionResult } from './poll-option'

type PollItem = FeedItemPoll['poll']

interface PollProps {
  feedItem: FeedItemPoll
  card?: boolean
}

export const PollContent = (props: PollProps) => {
  const [isEnded, setIsEnded] = React.useState(dayjs().isAfter(dayjs(props.feedItem.poll.endAt)))
  const queryClient = useQueryClient()

  const getPollOptionList = React.useCallback((props: PollProps) => {
    switch (props.feedItem.poll.type) {
      case 'SINGLE_CHOICE':
        return <PollSingleOptionList feedItem={props.feedItem} card={props.card} />
      case 'MULTIPLE_CHOICE':
        return <PollMultipleOptionList feedItem={props.feedItem} card={props.card} />
      default:
        exhaustiveGuard(props.feedItem.poll.type)
    }
  }, [])

  const triggerPollEnded = React.useCallback(() => {
    setIsEnded(true)
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/feed/:id', {
        pathParams: { id: props.feedItem.id },
      }),
    })
  }, [queryClient, props.feedItem.id])

  return (
    <>
      <View className="py-[13px] px-2 flex flex-col bg-base-bg-default rounded-xl mx-4">
        <PollHeader isEnded={isEnded} triggerEnded={triggerPollEnded} poll={props.feedItem.poll} />
        {isEnded ? (
          <PollOptionResultList feedItem={props.feedItem} card={props.card} />
        ) : (
          getPollOptionList({ feedItem: props.feedItem, card: props.card })
        )}
        {props.card && <PollSeeMore feedItem={props.feedItem} />}
      </View>
    </>
  )
}

const PollOptionResultList = (props: PollProps) => {
  const options = React.useMemo(() => {
    if (props.card) {
      return props.feedItem.poll.options.slice(0, 3)
    }
    return props.feedItem.poll.options
  }, [props.feedItem.poll.options, props.card])

  return (
    <View className="gap-2">
      {options.length > 0 &&
        options.map((option) => (
          <PollOptionResult
            id={option.id}
            key={option.id}
            title={option.title}
            votes={option.votes}
            totalVotes={props.feedItem.poll.totalVotes}
            isSelected={option.isSelected}
          />
        ))}
    </View>
  )
}

const PollSingleOptionList = (props: PollProps) => {
  const [optionId, setOptionId] = React.useState<string>('')
  const updatePollOptionMutation = reactQueryClient.useMutation('post', '/polls/:id/vote')

  const updatePollOptions = useDebouncedCallback(
    (options: string[]) => {
      updatePollOptionMutation.mutateAsync({
        pathParams: {
          id: props.feedItem.id,
        },
        body: {
          options: options,
        },
      })
    },
    {
      wait: 500, // Wait 300ms between executions
    }
  )

  React.useEffect(() => {
    const pollOptionSelected = props.feedItem.poll.options.find((option) => option.isSelected)
    setOptionId(pollOptionSelected?.id || '')
  }, [props.feedItem.poll.options])

  const isPollTouched = React.useMemo(() => {
    return props.feedItem.poll.options.some((option) => option.isSelected) || optionId !== ''
    // change if only if the optionId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionId])

  const options = React.useMemo(() => {
    if (props.card) {
      return props.feedItem.poll.options.slice(0, 3)
    }
    return props.feedItem.poll.options
  }, [props.feedItem.poll.options, props.card])

  function handleValueChange(value: string | undefined) {
    // optimistic update selection
    setOptionId(value || '')
    const updatedOptions = value ? [value] : []
    updatePollOptions(updatedOptions)
  }

  return (
    <PollOptionGroup
      type="single"
      onValueChange={handleValueChange}
      value={optionId}
      className="flex flex-col"
    >
      {options.length > 0 &&
        options.map((option, index) => (
          <PollOptionItem
            key={option.id}
            id={option.id}
            value={option.id}
            title={option.title}
            votes={option.votes}
            totalVotes={props.feedItem.poll.totalVotes}
            isSelected={option.isSelected}
            pollTouched={isPollTouched}
          />
        ))}
    </PollOptionGroup>
  )
}

const PollMultipleOptionList = (props: PollProps) => {
  const [optionIds, setOptionIds] = React.useState<string[]>([])
  const updatePollOptionMutation = reactQueryClient.useMutation('post', '/polls/:id/vote')

  const updatePollOptions = useDebouncedCallback(
    (options: string[]) => {
      updatePollOptionMutation.mutateAsync({
        pathParams: {
          id: props.feedItem.id,
        },
        body: {
          options: options,
        },
      })
    },
    {
      wait: 500, // Wait 300ms between executions
    }
  )

  React.useEffect(() => {
    const pollOptionSelected = props.feedItem.poll.options
    setOptionIds(
      pollOptionSelected.filter((option) => option.isSelected).map((option) => option.id)
    )
  }, [props.feedItem.poll.options])

  const isPollTouched = React.useMemo(() => {
    return optionIds.length > 0 || props.feedItem.poll.options.some((option) => option.isSelected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionIds])

  const options = React.useMemo(() => {
    if (props.card) {
      return props.feedItem.poll.options.slice(0, 3)
    }
    return props.feedItem.poll.options
  }, [props.feedItem.poll.options, props.card])

  const handleValueChange = (value: string[]) => {
    // optimistic update
    setOptionIds(value)
    updatePollOptions(value)
  }

  return (
    <PollOptionGroup
      type="multiple"
      onValueChange={handleValueChange}
      value={optionIds}
      className="flex flex-col"
    >
      {options.length > 0 &&
        options.map((option) => (
          <PollOptionItem
            key={option.id}
            id={option.id}
            value={option.id}
            title={option.title}
            votes={option.votes}
            totalVotes={props.feedItem.poll.totalVotes}
            isSelected={option.isSelected}
            pollTouched={isPollTouched}
          />
        ))}
    </PollOptionGroup>
  )
}

interface PollHeaderProps {
  poll: PollItem
  isEnded: boolean
  triggerEnded: () => void
}

const PollHeader = (props: PollHeaderProps) => {
  return (
    <View className="gap-1 flex flex-col mb-4">
      <View className="w-full flex flex-row items-center gap-2">
        <Icon
          icon={MessageCircleQuestionIcon}
          size={32}
          className="text-base-primary-default"
          strokeWidth={2}
        />
        <Text className="font-body-semibold flex-1">{props.poll.title}</Text>
      </View>
      <View className="flex flex-row items-center justify-between">
        <View className="flex flex-row items-center">
          <Icon
            icon={Clock3Icon}
            size={16}
            className="text-base-text-medium mr-1"
            strokeWidth={1}
          />
          <Text className="text-base-text-medium font-heading-regular text-sm items-center mt-2">
            เวลาที่เหลือ:{' '}
            <Text
              className={cn(
                'text-base-primary-default font-heading-bold',
                props.isEnded && 'text-base-text-high'
              )}
            >
              {props.isEnded ? (
                'หมดเวลา'
              ) : (
                <PollCountdownTimer
                  targetTime={props.poll.endAt}
                  triggerEnded={props.triggerEnded}
                />
              )}
            </Text>
          </Text>
        </View>
        <PollStatusBadge isEnded={props.isEnded} />
      </View>
    </View>
  )
}

interface PollCountdownTimerProps {
  targetTime: Date
  triggerEnded: () => void
}

export function PollCountdownTimer(props: PollCountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = React.useState(0)

  React.useEffect(() => {
    const targetTime = dayjs(props.targetTime)
    const interval = setInterval(() => {
      const seconds = targetTime.diff(dayjs(), 'second')
      setSecondsLeft(seconds >= 0 ? seconds : 0)
      if (seconds <= 0) {
        props.triggerEnded()
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.targetTime])

  return <>{secondsLeft ? formatTimeInterval(secondsLeft) : '--'}</>
}

const PollStatusBadge = ({ isEnded }: { isEnded: boolean }) => {
  return (
    <Badge variant={isEnded ? 'closed' : 'default'}>
      <Text>{isEnded ? 'ปิดโพลแล้ว' : 'โพลที่โหวตได้'}</Text>
    </Badge>
  )
}

const PollSeeMore = (props: { feedItem: FeedItemPoll }) => {
  const router = useRouter()

  if (props.feedItem.poll.options.length > 3) {
    return (
      <Pressable
        className="w-full border-2 border-base-outline-default flex flex-row justify-between items-center bg-base-bg-white font-body-medium rounded-2xl mt-2 p-3"
        onPress={() => {
          router.navigate(`/feed/${props.feedItem.id}`)
        }}
      >
        <Text className="font-body-medium text-base-text-medium text-sm">
          {`ดูเพิ่มเติม (อีก ${props.feedItem.poll.options.length - 3} ตัวเลือก)`}
        </Text>
        <Icon icon={ChevronRightIcon} size={24} strokeWidth={1} />
      </Pressable>
    )
  }

  return null
}
