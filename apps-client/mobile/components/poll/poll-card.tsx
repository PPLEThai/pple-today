import React from 'react'
import { View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { useRouter } from 'expo-router'
import { ChevronRightIcon, Clock3Icon, MessageCircleQuestionIcon } from 'lucide-react-native'

import type { FeedItemPoll } from '@api/backoffice/app'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

import { PollOptionItem, PollOptionResult } from './poll-option'

type PollItem = FeedItemPoll['poll']

export const PollCardContent = (props: { feedItem: FeedItemPoll }) => {
  const router = useRouter()
  const [isEnded, setIsEnded] = React.useState(dayjs().isAfter(dayjs(props.feedItem.poll.endAt)))

  return (
    <View className="gap-3">
      <View className="py-[13px] px-2 gap-4 flex flex-col bg-base-bg-default rounded-xl mx-4">
        <PollHeader
          isEnded={isEnded}
          triggerEnded={() => setIsEnded(true)}
          poll={props.feedItem.poll}
        />
        {isEnded ? (
          <PollCardOptionResultList {...props.feedItem.poll} />
        ) : (
          getPollCardOptionList(props.feedItem.poll)
        )}
        <Button
          variant="secondary"
          className="w-full text-start border-2 border-base-outline-default flex flex-row justify-between items-center bg-base-bg-white font-body-medium h-11 rounded-2xl"
          onPress={() => {
            router.navigate(`./feed/${props.feedItem.id}`)
          }}
        >
          <Text className="font-body-light text-base-text-medium text-sm">
            ดูเพิ่มเติม (อีก 3 ตัวเลือก)
          </Text>
          <Icon icon={ChevronRightIcon} size={24} strokeWidth={1} />
        </Button>
      </View>
    </View>
  )
}

export const PollDetailContent = (props: { feedItem: FeedItemPoll }) => {
  const [isEnded, setIsEnded] = React.useState(dayjs().isAfter(dayjs(props.feedItem.poll.endAt)))

  return (
    <View className="gap-3">
      <View className="py-[13px] px-2 gap-4 flex flex-col bg-base-bg-default rounded-xl mx-4">
        <PollHeader
          isEnded={isEnded}
          poll={props.feedItem.poll}
          triggerEnded={() => setIsEnded(true)}
        />
        {isEnded ? (
          <PollDetailOptionResultList {...props.feedItem.poll} />
        ) : (
          getPollDetailOptionList(props.feedItem.poll)
        )}
      </View>
    </View>
  )
}

const PollCardOptionResultList = (props: PollItem) => {
  return (
    <>
      {props.options.length > 0 &&
        props.options
          .slice(0, 3)
          .map((option) => (
            <PollOptionResult
              id={option.id}
              key={option.id}
              title={option.title}
              votes={option.votes}
              totalVotes={props.totalVotes}
              isSelected={option.isSelected}
            />
          ))}
    </>
  )
}

const PollDetailOptionResultList = (props: PollItem) => {
  return (
    <>
      {props.options.length > 0 &&
        props.options.map((option) => (
          <PollOptionResult
            id={option.id}
            key={option.id}
            title={option.title}
            votes={option.votes}
            totalVotes={props.totalVotes}
            isSelected={option.isSelected}
          />
        ))}
    </>
  )
}

function getPollCardOptionList(props: PollItem) {
  switch (props.type) {
    case 'SINGLE_CHOICE':
      return <PollSingleOptionList poll={props} card />
    case 'MULTIPLE_CHOICE':
      return <PollMultipleOptionList poll={props} card />
    default:
      exhaustiveGuard(props.type)
  }
}

function getPollDetailOptionList(props: PollItem) {
  switch (props.type) {
    case 'SINGLE_CHOICE':
      return <PollSingleOptionList poll={props} />
    case 'MULTIPLE_CHOICE':
      return <PollMultipleOptionList poll={props} />
    default:
      exhaustiveGuard(props.type)
  }
}

interface PollOptionListProps {
  poll: PollItem
  card?: boolean
}

const PollSingleOptionList = (props: PollOptionListProps) => {
  const [optionId, setOptionId] = React.useState<string | null>(null)

  const handleOptionSelect = (id: string) => {
    // TODO: call API remove previous vote if any
    setOptionId(id)
    // TODO: call API to submit vote
  }

  if (props.card) {
    return (
      <>
        {props.poll.options.length > 0 &&
          props.poll.options.slice(0, 3).map((option) => (
            <PollOptionItem
              key={option.id}
              id={option.id}
              title={option.title}
              votes={1} // TODO: integrate with real votes
              totalVotes={2} // TODO: integrate with real total votes
              isSelected={optionId === option.id}
              pollTouched={optionId !== null}
              onSelect={handleOptionSelect}
            />
          ))}
      </>
    )
  }

  return (
    <>
      {props.poll.options.length > 0 &&
        props.poll.options.map((option) => (
          <PollOptionItem
            key={option.id}
            id={option.id}
            title={option.title}
            votes={1} // TODO: integrate with real votes
            totalVotes={2} // TODO: integrate with real total votes
            isSelected={optionId === option.id}
            pollTouched={optionId !== null}
            onSelect={handleOptionSelect}
          />
        ))}
    </>
  )
}

const PollMultipleOptionList = (props: PollOptionListProps) => {
  const [optionIds, setOptionIds] = React.useState<string[]>([])

  const handleOptionSelect = (id: string) => {
    // TODO: call API remove previous vote if any
    setOptionIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((optionId) => optionId !== id)
      }
      return [...prev, id]
    })
    // TODO: call API updated submitted votes
  }

  if (props.card) {
    return (
      <>
        {props.poll.options.length > 0 &&
          props.poll.options.slice(0, 3).map((option) => (
            <PollOptionItem
              key={option.id}
              id={option.id}
              title={option.title}
              votes={1} // TODO: integrate with real votes
              totalVotes={2} // TODO: integrate with real total votes
              isSelected={optionIds.includes(option.id)}
              pollTouched={optionIds.length > 0}
              onSelect={handleOptionSelect}
            />
          ))}
      </>
    )
  }

  return (
    <>
      {props.poll.options.length > 0 &&
        props.poll.options.map((option) => (
          <PollOptionItem
            key={option.id}
            id={option.id}
            title={option.title}
            votes={1} // TODO: integrate with real votes
            totalVotes={2} // TODO: integrate with real total votes
            isSelected={optionIds.includes(option.id)}
            pollTouched={optionIds.length > 0}
            onSelect={handleOptionSelect}
          />
        ))}
    </>
  )
}

interface PollHeaderProps {
  poll: PollItem
  isEnded: boolean
  triggerEnded: () => void
}

const PollHeader = (props: PollHeaderProps) => {
  return (
    <View className="gap-1 flex flex-col">
      <View className="w-full flex flex-row items-center gap-2">
        <Icon
          icon={MessageCircleQuestionIcon}
          size={32}
          className="text-base-primary-default"
          strokeWidth={2}
        />
        <Text className="font-body-medium flex-1">{props.poll.title}</Text>
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
              <PollCountdownTimer triggerEnded={props.triggerEnded} targetTime={props.poll.endAt} />
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

dayjs.extend(duration)

export function PollCountdownTimer(props: PollCountdownTimerProps) {
  const [display, setDisplay] = React.useState('')

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = dayjs()
      const target = dayjs(props.targetTime)
      const diff = target.diff(now)

      if (diff <= 0) {
        setDisplay('หมดเวลา')
        clearInterval(timer)
        props.triggerEnded()
        return
      }

      const d = dayjs.duration(diff)
      const totalHours = d.asHours()
      const totalMinutes = d.asMinutes()
      const totalSeconds = d.asSeconds()

      if (totalHours >= 24) {
        setDisplay(`${Math.floor(d.asDays())} วัน`)
      } else if (totalHours >= 1) {
        setDisplay(`${Math.floor(totalHours)} ชั่วโมง`)
      } else if (totalMinutes >= 1) {
        setDisplay(`${Math.floor(totalMinutes)} นาที`)
      } else {
        setDisplay(`${Math.floor(totalSeconds)} วินาที`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [props.targetTime, props.triggerEnded, props])

  return <>{display}</>
}

const PollStatusBadge = ({ isEnded }: { isEnded: boolean }) => {
  if (isEnded) {
    return (
      <Badge variant={'closed'}>
        <Text>ปิดโพลแล้ว</Text>
      </Badge>
    )
  }

  return (
    <Badge>
      <Text>โพลที่โหวตได้</Text>
    </Badge>
  )
}
