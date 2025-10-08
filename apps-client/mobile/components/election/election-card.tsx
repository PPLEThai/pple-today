import { useCallback, useEffect, useState } from 'react'
import { Pressable, PressableProps, View, ViewProps } from 'react-native'
import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Progress } from '@pple-today/ui/progress'
import { Text } from '@pple-today/ui/text'
import { H3 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import * as Linking from 'expo-linking'
import { Link, useRouter } from 'expo-router'
import {
  AlarmClockCheckIcon,
  AlarmClockIcon,
  ArrowRightIcon,
  CalendarIcon,
  CircleAlertIcon,
  ClockIcon,
  MapPinIcon,
  MapPinnedIcon,
  UserRoundCheckIcon,
} from 'lucide-react-native'

import { ElectionWithCurrentStatus } from '@api/backoffice/app'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { reactQueryClient } from '@app/libs/api-client'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

interface ElectionCardProps extends PressableProps {
  election: ElectionWithCurrentStatus
}
export function ElectionCard({ election, className, ...props }: ElectionCardProps) {
  const router = useRouter()
  return (
    <>
      <Pressable
        className={cn(
          'w-full bg-base-secondary-default rounded-2xl flex flex-col justify-between gap-2 p-4 overflow-hidden',
          className
        )}
        onPress={() => router.push(`/election/${election.id}`)}
        {...props}
      >
        <View className="flex flex-col gap-2">
          <Icon
            icon={PPLEIcon}
            width={239}
            height={239}
            className="absolute -right-10 top-0 text-base-primary-default opacity-40"
          />
          <View className="flex flex-row justify-between w-full">
            <ElectionTypeBadge type={election.type} />
            <ElectionStatusBadge status={election.status} />
          </View>
          <H3 className="text-base-text-invert font-heading-bold text-xl line-clamp-2 self-start">
            {election.name}
          </H3>
          <ElectionCardDetail election={election} />
        </View>
        <ElectionCardFooter election={election} />
      </Pressable>
      <ElectionRegisterWarning election={election} />
    </>
  )
}

export function ElectionTypeBadge(props: { type: ElectionWithCurrentStatus['type'] }) {
  return (
    <Badge variant="secondary">
      <Text>{getElectionTypeLabel(props.type)}</Text>
    </Badge>
  )
}
export function getElectionTypeLabel(type: ElectionWithCurrentStatus['type']) {
  switch (type) {
    case 'ONLINE':
      return 'เลือกตั้งออนไลน์'
    case 'ONSITE':
      return 'เลือกตั้งในสถานที่'
    case 'HYBRID':
      return 'เลือกตั้งแบบผสม'
    default:
      exhaustiveGuard(type)
  }
}

export function ElectionStatusBadge(props: { status: ElectionWithCurrentStatus['status'] }) {
  switch (props.status) {
    case 'NOT_OPENED_VOTE':
      return (
        <Badge variant="secondary">
          <Text>ยังไม่เปิดหีบ</Text>
        </Badge>
      )
    case 'OPEN_VOTE':
      return (
        <Badge variant="success">
          <Text>เปิดหีบ</Text>
        </Badge>
      )
    case 'CLOSED_VOTE':
      return (
        <Badge variant="destructive">
          <Text>ปิดหีบ</Text>
        </Badge>
      )
    case 'RESULT_ANNOUNCE':
      return (
        <Badge variant="default">
          <Text>ประกาศผล</Text>
        </Badge>
      )
    default:
      exhaustiveGuard(props.status)
  }
}

function ElectionCardDetail(props: ElectionCardProps) {
  switch (props.election.status) {
    case 'NOT_OPENED_VOTE': {
      if (props.election.type === 'ONLINE') {
        return <ElectionOpenVotingDate election={props.election} />
      }
      if (props.election.type === 'ONSITE') {
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            <ElectionLocation election={props.election} />
          </>
        )
      }
      if (props.election.type === 'HYBRID') {
        if (dayjs().isBefore(props.election.openRegister)) {
          return (
            <>
              <ElectionOpenVotingDate election={props.election} />
              <ElectionOpenRegisterDate election={props.election} />
            </>
          )
        }
        if (dayjs().isBefore(props.election.closeRegister)) {
          return (
            <>
              <ElectionOpenVotingDate election={props.election} />
              <ElectionCloseRegisterDate election={props.election} />
            </>
          )
        }
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            {!props.election.isRegistered && (
              <>
                <ElectionLocation election={props.election} />
                <Badge variant="outline" className="self-stretch">
                  <Text className="text-base-text-invert">
                    หมดเวลาลงทะเบียนแล้ว คุณมีสิทธิ์เลือกตั้งในสถานที่
                  </Text>
                </Badge>
              </>
            )}
          </>
        )
      }
      break
    }
    case 'OPEN_VOTE':
      if (
        props.election.type === 'ONLINE' ||
        (props.election.type === 'HYBRID' && props.election.isRegistered)
      ) {
        return (
          <>
            <ElectionTimeLeft election={props.election} />
            <Progress value={props.election.votePercentage} />
          </>
        )
      }
      return (
        <>
          <ElectionTimeLeft election={props.election} />
          <ElectionLocation election={props.election} />
        </>
      )

    case 'CLOSED_VOTE':
      return (
        <View className="flex flex-row gap-1 items-center">
          <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
          <Text className="text-sm text-base-text-invert font-heading-regular">
            รอประกาศผลเลือกตั้ง
          </Text>
        </View>
      )
    case 'RESULT_ANNOUNCE':
      return null
    default:
      exhaustiveGuard(props.election.status)
  }
}

function ElectionOpenRegisterDate(props: ElectionCardProps) {
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
      <Text className="text-sm text-base-text-invert font-heading-regular">
        เปิดให้ลงทะเบียน:{' '}
        <Text className="text-sm text-base-primary-default font-body-medium">
          {dayjs(props.election.openRegister).format('D MMM BBBB เวลา HH:mm')}
        </Text>
      </Text>
    </View>
  )
}
function ElectionCloseRegisterDate(props: ElectionCardProps) {
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
      <Text className="text-sm text-base-text-invert font-heading-regular">
        เปิดลงทะเบียนถึง:{' '}
        <Text className="text-sm text-base-primary-default font-body-medium">
          {dayjs(props.election.closeRegister).format('D MMM BBBB เวลา HH:mm')}
        </Text>
      </Text>
    </View>
  )
}
function ElectionOpenVotingDate(props: ElectionCardProps) {
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon icon={CalendarIcon} size={16} className="text-base-text-invert" />
      <Text className="text-sm text-base-text-invert font-heading-regular">
        วันที่เปิดหีบ:{' '}
        <Text className="text-sm text-base-primary-default font-body-medium">
          {dayjs(props.election.openVoting).format('D MMM BBBB เวลา HH:mm')}
        </Text>
      </Text>
    </View>
  )
}
function ElectionLocation(props: ElectionCardProps) {
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon icon={MapPinIcon} size={16} className="text-base-text-invert" />
      <Text className="text-sm text-base-text-invert font-heading-regular">
        สถานที่:{' '}
        <Text className="text-sm text-base-text-invert font-body-medium">
          {props.election.location}
        </Text>
      </Text>
    </View>
  )
}
function ElectionTimeLeft(props: ElectionCardProps) {
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
      <Text className="text-sm text-base-text-invert font-heading-regular">
        เวลาที่เหลือ: <CountdownTimer targetTime={props.election.closeVoting} />
      </Text>
    </View>
  )
}
export function CountdownTimer(props: { targetTime: Date }) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    const targetTime = dayjs(props.targetTime)
    const interval = setInterval(() => {
      const seconds = targetTime.diff(dayjs(), 'second')
      setSecondsLeft(seconds >= 0 ? seconds : 0)
    }, 1000)

    return () => clearInterval(interval)
  }, [props.targetTime])

  return (
    <Text className="text-sm text-base-primary-default font-body-medium">
      {dayjs
        .duration({
          hours: Math.max(Math.floor(secondsLeft / 3600), 0),
          minutes: Math.max(Math.floor((secondsLeft % 3600) / 60), 0),
          seconds: Math.max(secondsLeft % 60, 0),
        })
        .format('HH:mm:ss')}{' '}
      ชั่วโมง
    </Text>
  )
}

function ElectionCardFooter(props: ElectionCardProps) {
  switch (props.election.status) {
    case 'NOT_OPENED_VOTE': {
      if (props.election.type === 'ONLINE') {
        return (
          <ElectionNotification electionId={props.election.id}>
            {({ isEnabled, setIsEnabled }) => (
              <Button size="sm" className="w-full mt-2" onPress={() => setIsEnabled(!isEnabled)}>
                <Icon icon={isEnabled ? AlarmClockCheckIcon : AlarmClockIcon} size={16} />
                <Text>{isEnabled ? 'ตั้งแจ้งเตือนแล้ว' : 'แจ้งเตือน'}</Text>
              </Button>
            )}
          </ElectionNotification>
        )
      }
      if (props.election.type === 'ONSITE') {
        return (
          <View className="flex flex-row pt-2 gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onPress={() => Linking.openURL(props.election.locationMapUrl!)}
            >
              <Icon icon={MapPinnedIcon} size={16} />
              <Text>ดูสถานที่</Text>
            </Button>
            <ElectionNotification electionId={props.election.id}>
              {({ isEnabled, setIsEnabled }) => (
                <Button size="sm" className="flex-1" onPress={() => setIsEnabled(!isEnabled)}>
                  <Icon icon={isEnabled ? AlarmClockCheckIcon : AlarmClockIcon} size={16} />
                  <Text>{isEnabled ? 'ตั้งแจ้งเตือนแล้ว' : 'แจ้งเตือน'}</Text>
                </Button>
              )}
            </ElectionNotification>
          </View>
        )
      }
      if (props.election.type === 'HYBRID') {
        if (dayjs().isBefore(props.election.closeRegister) || props.election.isRegistered) {
          return (
            <View className="flex flex-row pt-2 gap-2.5">
              <ElectionNotification electionId={props.election.id}>
                {({ isEnabled, setIsEnabled }) => (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9"
                    onPress={() => setIsEnabled(!isEnabled)}
                  >
                    <Icon icon={isEnabled ? AlarmClockCheckIcon : AlarmClockIcon} size={16} />
                  </Button>
                )}
              </ElectionNotification>
              <ElectionRegisterButton election={props.election} />
            </View>
          )
        }
        return (
          <View className="flex flex-row pt-2 gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onPress={() => Linking.openURL(props.election.locationMapUrl!)}
            >
              <Icon icon={MapPinnedIcon} size={16} />
              <Text>ดูสถานที่</Text>
            </Button>
            <ElectionNotification electionId={props.election.id}>
              {({ isEnabled, setIsEnabled }) => (
                <Button size="sm" className="flex-1" onPress={() => setIsEnabled(!isEnabled)}>
                  <Icon icon={isEnabled ? AlarmClockCheckIcon : AlarmClockIcon} size={16} />
                  <Text>{isEnabled ? 'ตั้งแจ้งเตือนแล้ว' : 'แจ้งเตือน'}</Text>
                </Button>
              )}
            </ElectionNotification>
          </View>
        )
      }
      break
    }
    case 'OPEN_VOTE':
      if (
        props.election.type === 'ONLINE' ||
        (props.election.type === 'HYBRID' && props.election.isRegistered)
      ) {
        return <ElectionPercentageActions election={props.election} />
      }
      return (
        <Button
          variant="secondary"
          size="sm"
          className="w-full mt-2"
          onPress={() => Linking.openURL(props.election.locationMapUrl!)}
        >
          <Icon icon={MapPinnedIcon} size={16} />
          <Text>ดูสถานที่</Text>
        </Button>
      )
    case 'CLOSED_VOTE':
      return null
    case 'RESULT_ANNOUNCE':
      return (
        <View className="flex flex-row pt-2 gap-2.5">
          <Link href={`./election/${props.election.id}`} asChild>
            <Button className="w-full" size="sm">
              <Text>ดูผลการเลือกตั้ง</Text>
              <Icon icon={ArrowRightIcon} size={16} />
            </Button>
          </Link>
        </View>
      )
    default:
      exhaustiveGuard(props.election.status)
  }
}

function ElectionPercentageActions(props: ElectionCardProps) {
  return (
    <View className="flex flex-row pt-2 gap-2.5">
      <Text className="text-sm text-base-text-invert font-heading-regular">
        ใช้สิทธิ์แล้ว: {Math.floor(props.election.votePercentage)}%
      </Text>
      <Link href={`./election/${props.election.id}`} asChild>
        <Button size="sm" className="flex-1">
          <Text>{props.election.isVoted ? 'ลงคะแนนใหม่' : 'ไปเลือกตั้ง'}</Text>
          <Icon icon={ArrowRightIcon} size={16} />
        </Button>
      </Link>
    </View>
  )
}

const useElectionNotificationQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'electionNotification'],
  fetcher: (_: { electionId: string }): boolean => {
    throw new Error('ElectionNotificationQuery should not be enabled')
  },
  enabled: false,
  initialData: false,
})
function useElectionNotificationState(electionId: string, initialData: boolean) {
  const electionNotificationQuery = useElectionNotificationQuery({
    variables: { electionId },
    initialData: initialData,
  })
  const queryClient = useQueryClient()
  const setElectionNotificationState = useCallback(
    (data: boolean) => {
      queryClient.setQueryData(useElectionNotificationQuery.getKey({ electionId }), data)
    },
    [queryClient, electionId]
  )
  return [electionNotificationQuery.data, setElectionNotificationState] as const
}
interface ElectionNotificationProps {
  electionId: string
  // TODO
  initialData?: boolean
  children: ({
    isEnabled,
    setIsEnabled,
  }: {
    isEnabled: boolean
    setIsEnabled: (value: boolean) => void
  }) => React.ReactNode
}
export function ElectionNotification(props: ElectionNotificationProps) {
  const [isEnabled, setIsEnabled] = useElectionNotificationState(
    props.electionId,
    props.initialData ?? false
  )
  return props.children({ isEnabled, setIsEnabled })
}

interface ElectionDetailCardProps extends ViewProps {
  election: ElectionWithCurrentStatus
}
export function ElectionDetailCard({ election, className, ...props }: ElectionDetailCardProps) {
  return (
    <View
      className={cn(
        'w-full bg-base-secondary-default rounded-2xl flex flex-col justify-between gap-2 p-4 overflow-hidden',
        className
      )}
      {...props}
    >
      <View className="flex flex-col gap-2">
        <Icon
          icon={PPLEIcon}
          width={239}
          height={239}
          className="absolute -right-10 top-0 text-base-primary-default opacity-40"
        />
        <View className="flex flex-row justify-between w-full">
          <ElectionTypeBadge type={election.type} />
          <ElectionStatusBadge status={election.status} />
        </View>
        <ElectionDetailCardDetail election={election} />
      </View>
    </View>
  )
}

function ElectionDetailCardDetail(props: ElectionDetailCardProps) {
  switch (props.election.status) {
    case 'NOT_OPENED_VOTE': {
      if (props.election.type === 'ONLINE') {
        return <ElectionOpenVotingDate election={props.election} />
      }
      if (props.election.type === 'ONSITE') {
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            <ElectionLocation election={props.election} />
          </>
        )
      }
      if (props.election.type === 'HYBRID') {
        if (dayjs().isBefore(props.election.openRegister)) {
          return (
            <>
              <ElectionOpenVotingDate election={props.election} />
              <ElectionOpenRegisterDate election={props.election} />
            </>
          )
        }
        if (dayjs().isBefore(props.election.closeRegister)) {
          return (
            <>
              <ElectionOpenVotingDate election={props.election} />
              <ElectionCloseRegisterDate election={props.election} />
            </>
          )
        }
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            {!props.election.isRegistered && (
              <>
                <ElectionLocation election={props.election} />
                <Badge variant="outline" className="self-stretch">
                  <Text className="text-base-text-invert">
                    หมดเวลาลงทะเบียนแล้ว คุณมีสิทธิ์เลือกตั้งในสถานที่
                  </Text>
                </Badge>
              </>
            )}
          </>
        )
      }
      break
    }
    case 'OPEN_VOTE':
      if (
        props.election.type === 'ONLINE' ||
        (props.election.type === 'HYBRID' && props.election.isRegistered)
      ) {
        return (
          <>
            <ElectionTimeLeft election={props.election} />
            <ElectionPercentage election={props.election} />
          </>
        )
      }
      return (
        <>
          <ElectionTimeLeft election={props.election} />
          <ElectionLocation election={props.election} />
        </>
      )
    case 'CLOSED_VOTE':
      return (
        <View className="flex flex-row gap-1 items-center">
          <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
          <Text className="text-sm text-base-text-invert font-heading-regular">
            รอประกาศผลเลือกตั้ง
          </Text>
        </View>
      )
    case 'RESULT_ANNOUNCE':
      return null
    default:
      exhaustiveGuard(props.election.status)
  }
}

function ElectionPercentage(props: ElectionDetailCardProps) {
  return (
    <View className="flex flex-row pt-2 gap-2.5">
      <Text className="text-sm text-base-text-invert font-heading-regular">
        ใช้สิทธิ์แล้ว: {Math.floor(props.election.votePercentage)}%
      </Text>
    </View>
  )
}

function ElectionRegisterButton(props: ElectionCardProps) {
  const electionRegisterMutation = reactQueryClient.useMutation(
    'post',
    '/elections/:electionId/register',
    {}
  )
  const [isRegistered, setIsRegistered] = useState(props.election.isRegistered)
  return (
    <Button
      size="sm"
      className="flex-1"
      disabled={
        isRegistered ||
        electionRegisterMutation.isPending ||
        dayjs().isBefore(props.election.openRegister)
      }
      onPress={() => {
        if (isRegistered) return
        setIsRegistered(true)
        electionRegisterMutation.mutateAsync(
          {
            pathParams: { electionId: props.election.id },
            body: { type: 'ONLINE' },
          },
          {
            onError: (error) => {
              console.error('Election register error', JSON.stringify(error))
              setIsRegistered(false)
            },
          }
        )
      }}
    >
      <Icon icon={UserRoundCheckIcon} size={16} />
      <Text>{isRegistered ? 'ลงทะเบียนแล้ว' : 'ลงทะเบียนเลือกตั้งออนไลน์'}</Text>
    </Button>
  )
}

function ElectionRegisterWarning(props: ElectionCardProps) {
  if (
    props.election.type !== 'HYBRID' ||
    dayjs().isAfter(props.election.closeRegister) ||
    dayjs().isBefore(props.election.openRegister) ||
    props.election.isRegistered
  ) {
    return null
  }
  return (
    <View className="rounded-2xl p-2 flex flex-row gap-2 bg-base-bg-white border border-base-outline-default mt-2">
      <Icon icon={CircleAlertIcon} size={24} className="text-base-primary-default" />
      <Text className="text-xs text-base-text-medium font-heading-regular">
        {'หากไม่ลงทะเบียนเลือกตั้งภายในเวลาที่กำหนดระบบจะจัดให้\nคุณเลือกตั้งในสถานที่โดยอัตโนมัติ'}
      </Text>
    </View>
  )
}
