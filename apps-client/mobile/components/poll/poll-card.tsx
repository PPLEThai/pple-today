import React from 'react'
import { Pressable, View } from 'react-native'
import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
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
import { useSession } from '@app/libs/auth'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { formatTimeInterval } from '@app/libs/format-time-interval'

import { PollOptionGroup, PollOptionItem, PollOptionResult } from './poll-option'

type PollItem = FeedItemPoll['poll']
type PollOption = PollItem['options'][number]

interface PollProps {
  feedItem: FeedItemPoll
  card?: boolean
}

interface PollVotes {
  totalVotes: number
  options: PollOption[]
}

// create store using react query
export const usePollVotesQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'poll-options'],
  fetcher: (_: { feedId: string }): PollVotes => {
    throw new Error('PollVoteStore should not be enabled')
  },
  enabled: false,
})

function usePollVotesValue(feedId: string): PollVotes {
  const pollVotesQuery = usePollVotesQuery({ variables: { feedId } })
  return pollVotesQuery.data!
}

function useSetPollVotes(feedId: string) {
  const queryClient = useQueryClient()
  return React.useCallback(
    (oldVotes: string[], newVotes: string[]) => {
      queryClient.setQueryData(
        usePollVotesQuery.getKey({ feedId }),
        (oldData: PollVotes | undefined) => {
          if (!oldData) return
          const { newOptions, newTotalVotes } = getNewVotes(
            oldData.totalVotes,
            oldData.options,
            oldVotes,
            newVotes
          )
          return {
            ...oldData,
            totalVotes: newTotalVotes,
            options: newOptions,
          }
        }
      )
    },
    [queryClient, feedId]
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
    queryClient.refetchQueries({
      queryKey: reactQueryClient.getQueryKey('/feed/:id', {
        pathParams: { id: props.feedItem.id },
      }),
      exact: true,
    })
  }, [queryClient, props.feedItem.id])

  return (
    <View className="py-[13px] px-2 flex flex-col bg-base-bg-default rounded-xl mx-4">
      <PollVotesHook feedId={props.feedItem.id} data={props.feedItem} />
      <PollHeader isEnded={isEnded} triggerEnded={triggerPollEnded} poll={props.feedItem.poll} />
      {isEnded ? (
        <PollOptionResultList feedItem={props.feedItem} card={props.card} />
      ) : (
        getPollOptionList({ feedItem: props.feedItem, card: props.card })
      )}
      {props.card && <PollSeeMore feedItem={props.feedItem} />}
    </View>
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
  const router = useRouter()
  const session = useSession()
  const { options, totalVotes } = usePollVotesValue(props.feedItem.id)
  const setPollVotes = useSetPollVotes(props.feedItem.id)
  const updatePollOptionMutation = reactQueryClient.useMutation('put', '/polls/:id/vote')

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
      wait: 500,
    }
  )

  const selectedOption = options.find((option) => option.isSelected)?.id ?? ''

  const isPollTouched = options.some((option) => option.isSelected)

  const listOptions = React.useCallback(
    (options: PollOption[]) => {
      let renderedOptions = options
      if (props.card) {
        renderedOptions = options.slice(0, 3)
      }

      return renderedOptions.map((option) => (
        <PollOptionItem
          key={option.id}
          id={option.id}
          value={option.id}
          title={option.title}
          votes={option.votes}
          totalVotes={totalVotes}
          isSelected={option.isSelected}
          pollTouched={isPollTouched}
        />
      ))
    },
    [props.card, isPollTouched, totalVotes]
  )

  function handleValueChange(value: string | undefined) {
    if (!session) {
      router.navigate('/profile')
      return
    }

    const updatedOptions = value ? [value] : []
    const oldSelectedOption = selectedOption !== '' ? [selectedOption] : []
    // optimistic update
    setPollVotes(oldSelectedOption, updatedOptions)
    updatePollOptions(updatedOptions)
  }

  return (
    <PollOptionGroup
      type="single"
      onValueChange={handleValueChange}
      value={selectedOption}
      className="flex flex-col"
    >
      {listOptions(options)}
    </PollOptionGroup>
  )
}

const PollMultipleOptionList = (props: PollProps) => {
  const router = useRouter()
  const session = useSession()
  const { options, totalVotes } = usePollVotesValue(props.feedItem.id)
  const setPollVotes = useSetPollVotes(props.feedItem.id)
  const updatePollOptionMutation = reactQueryClient.useMutation('put', '/polls/:id/vote')

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
      wait: 500,
    }
  )
  const selectedOptions = options.flatMap((option) => (option.isSelected ? [option.id] : []))

  const isPollTouched = options.some((option) => option.isSelected)

  const listOptions = React.useCallback(
    (options: PollOption[]) => {
      let renderedOptions = options
      if (props.card) {
        renderedOptions = options.slice(0, 3)
      }

      return renderedOptions.map((option) => (
        <PollOptionItem
          key={option.id}
          id={option.id}
          value={option.id}
          title={option.title}
          votes={option.votes}
          totalVotes={totalVotes}
          isSelected={option.isSelected}
          pollTouched={isPollTouched}
        />
      ))
    },
    [props.card, isPollTouched, totalVotes]
  )

  const handleValueChange = async (value: string[]) => {
    if (!session) {
      router.navigate('/profile')
      return
    }
    // optimistic update
    setPollVotes(selectedOptions, value)
    updatePollOptions(value)
  }

  return (
    <PollOptionGroup
      type="multiple"
      onValueChange={handleValueChange}
      value={selectedOptions}
      className="flex flex-col"
    >
      {listOptions(options)}
    </PollOptionGroup>
  )
}

function getNewVotes(
  oldtotalVotes: number,
  options: PollOption[],
  oldVotes: string[],
  newVotes: string[]
) {
  const newOptions = options.map((option) => {
    const updatedOption = { ...option }
    if (oldVotes.includes(option.id)) {
      updatedOption.isSelected = false
      updatedOption.votes = Math.max(0, option.votes - 1)
    }
    if (newVotes.includes(option.id)) {
      updatedOption.isSelected = true
      updatedOption.votes = updatedOption.votes + 1
    }
    return updatedOption
  })
  const voteDecrement = oldVotes.length >= 1 ? 1 : 0
  const voteIncrement = newVotes.length >= 1 ? 1 : 0
  const newTotalVotes = oldtotalVotes - voteDecrement + voteIncrement
  return { newOptions, newTotalVotes }
}

function PollVotesHook({ feedId, data }: { feedId: string; data: FeedItemPoll }) {
  usePollVotesQuery({
    variables: { feedId },
    initialData: () => getPollVotes(data),
  })
  const queryClient = useQueryClient()
  React.useEffect(() => {
    if (!data) return
    queryClient.setQueryData(usePollVotesQuery.getKey({ feedId }), getPollVotes(data))
  }, [data, queryClient, feedId])
  return null
}

function getPollVotes(data: FeedItemPoll): PollVotes {
  const options = data.poll.options
  const totalVotes = data.poll.totalVotes
  return { totalVotes, options }
}
