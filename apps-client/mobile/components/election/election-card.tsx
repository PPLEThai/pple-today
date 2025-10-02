import { View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Progress } from '@pple-today/ui/progress'
import { Text } from '@pple-today/ui/text'
import { H3 } from '@pple-today/ui/typography'
import dayjs from 'dayjs'
import {
  AlarmClockIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  MapPinnedIcon,
  UserRoundCheckIcon,
} from 'lucide-react-native'

import { ElectionWithCurrentStatus } from '@api/backoffice/app'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

interface ElectionCardProps {
  election: ElectionWithCurrentStatus
}
export function ElectionCard(props: ElectionCardProps) {
  return (
    <View className="w-full bg-base-secondary-default rounded-2xl flex flex-col items-start gap-2 p-4 overflow-hidden">
      <Icon
        icon={PPLEIcon}
        width={239}
        height={239}
        className="absolute -right-10 top-0 text-base-primary-default opacity-40"
      />
      <View className="flex flex-row justify-between w-full">
        <Badge variant="secondary">
          <Text>{getElectionTypeLabel(props.election.type)}</Text>
        </Badge>
        <ElectionStatusBadge status={props.election.status} />
      </View>
      <H3 className="text-base-text-invert font-heading-bold text-xl line-clamp-2">
        {props.election.name}
      </H3>
      <ElectionCardDetail election={props.election} />
    </View>
  )
}

function getElectionTypeLabel(type: ElectionWithCurrentStatus['type']) {
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
    case 'NOT_OPENED_VOTE':
      if (props.election.type === 'ONLINE') {
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            {/* TODO */}
            <Button size="sm" className="self-stretch mt-2">
              <Icon icon={AlarmClockIcon} size={16} />
              <Text>แจ้งเตือน</Text>
            </Button>
          </>
        )
      }
      if (props.election.type === 'ONSITE') {
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            <ElectionLocation election={props.election} />
            <View className="self-stretch mt-2 flex flex-row gap-2.5">
              {/* TODO */}
              <Button size="sm" variant="secondary" className="flex-1">
                <Icon icon={MapPinnedIcon} size={16} />
                <Text>ดูสถานที่</Text>
              </Button>
              <Button size="sm" className="flex-1">
                <Icon icon={AlarmClockIcon} size={16} />
                <Text>แจ้งเตือน</Text>
              </Button>
            </View>
          </>
        )
      }
      if (props.election.type === 'HYBRID') {
        if (!props.election.isRegistered) {
          return (
            <>
              <ElectionOpenVotingDate election={props.election} />
              <View className="flex flex-row gap-1 items-center">
                <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
                <Text className="text-sm text-base-text-invert font-heading-regular">
                  เปิดลงทะเบียนถึง:{' '}
                  <Text className="text-sm text-base-primary-default font-body-medium">
                    {dayjs(props.election.openRegister).format('D MMM BBBB เวลา HH:mm')}
                  </Text>
                </Text>
              </View>
              <View className="self-stretch mt-2 flex flex-row gap-2.5">
                {/* TODO */}
                <Button size="icon" variant="secondary" className="h-9 w-9">
                  <Icon icon={AlarmClockIcon} size={16} />
                </Button>
                <Button size="sm" className="flex-1">
                  <Icon icon={UserRoundCheckIcon} size={16} />
                  <Text>ลงทะเบียนเลือกตั้งออนไลน์</Text>
                </Button>
              </View>
            </>
          )
        }
        return (
          <>
            <ElectionOpenVotingDate election={props.election} />
            <Badge variant="outline" className="self-stretch">
              <Text className="text-base-text-invert">
                หมดเวลาลงทะเบียนแล้ว คุณมีสิทธิ์เลือกตั้งในสถานที่
              </Text>
            </Badge>
            <View className="self-stretch mt-2 flex flex-row gap-2.5">
              {/* TODO */}
              <Button size="sm" variant="secondary" className="flex-1">
                <Icon icon={MapPinnedIcon} size={16} />
                <Text>ดูสถานที่</Text>
              </Button>
              <Button size="sm" className="flex-1">
                <Icon icon={AlarmClockIcon} size={16} />
                <Text>แจ้งเตือน</Text>
              </Button>
            </View>
          </>
        )
      }
      break
    case 'OPEN_VOTE':
      if (props.election.type === 'ONLINE') {
        return (
          <>
            <ElectionTimeLeft election={props.election} />
            <ElectionPercentageActions election={props.election} />
          </>
        )
      }
      if (props.election.type === 'ONSITE') {
        return (
          <>
            <ElectionTimeLeft election={props.election} />
            <ElectionLocation election={props.election} />
            {/* TODO */}
            <Button variant="secondary" size="sm" className="self-stretch mt-2">
              <Icon icon={MapPinnedIcon} size={16} />
              <Text>ดูสถานที่</Text>
            </Button>
          </>
        )
      }
      if (props.election.type === 'HYBRID') {
        return (
          <>
            <ElectionTimeLeft election={props.election} />
            <ElectionPercentageActions election={props.election} />
          </>
        )
      }
      break
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
      return (
        <Button className="self-stretch mt-2" size="sm">
          <Text>ดูผลการเลือกตั้ง</Text>
          <Icon icon={ArrowRightIcon} size={16} />
        </Button>
      )
    default:
      exhaustiveGuard(props.election.status)
  }
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
  const seconds = dayjs(props.election.closeVoting).diff(dayjs(), 'second')
  return (
    <View className="flex flex-row gap-1 items-center">
      <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
      <Text className="text-sm text-base-text-invert font-heading-regular">
        เวลาที่เหลือ:{' '}
        <Text className="text-sm text-base-primary-default font-body-medium">
          {dayjs
            .duration({
              hours: Math.max(Math.floor(seconds / 3600), 0),
              minutes: Math.max(Math.floor((seconds % 3600) / 60), 0),
              seconds: Math.max(seconds % 60, 0),
            })
            .format('HH:mm:ss')}{' '}
          ชั่วโมง
        </Text>
      </Text>
    </View>
  )
}
function ElectionPercentageActions(props: ElectionCardProps) {
  return (
    <>
      <Progress value={props.election.votePercentage} />
      <View className="self-stretch mt-2 flex flex-row gap-2.5">
        <Text className="text-sm text-base-text-invert font-heading-regular">
          ใช้สิทธิ์แล้ว: {Math.floor(props.election.votePercentage)}%
        </Text>
        {/* TODO */}
        <Button size="sm" className="flex-1">
          <Text>{props.election.isVoted ? 'ลงคะแนนใหม่' : 'ไปเลือกตั้ง'}</Text>
          <Icon icon={ArrowRightIcon} size={16} />
        </Button>
      </View>
    </>
  )
}
