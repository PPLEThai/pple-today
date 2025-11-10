import { Badge } from '@pple-today/web-ui/badge'
import dayjs from 'dayjs'

import { GetPollsResponse } from '@api/backoffice/admin'

import { exhaustiveGuard } from '~/libs/exhaustive-guard'

interface PollBadgeProps {
  poll: GetPollsResponse['data'][number]
}

export function PollBadge(props: PollBadgeProps) {
  const status = getPollStatus(props.poll)

  switch (status) {
    case 'PUBLISHED_ONGOING':
      return <Badge variant={'success'}>ประกาศแล้ว</Badge>
    case 'PUBLISHED_ENDED':
      return <Badge variant={'closed'}>ปิดโพลแล้ว</Badge>
    case 'ARCHIVED':
      return <Badge variant={'secondary'}>เก็บในคลัง</Badge>
    case 'DRAFT':
      return <Badge variant={'outline'}>ร่าง</Badge>
    default:
      return exhaustiveGuard(status)
  }
}

function getPollStatus(poll: GetPollsResponse['data'][number]) {
  switch (poll.status) {
    case 'PUBLISHED':
      if (dayjs(new Date()).isAfter(poll.endAt)) {
        return 'PUBLISHED_ENDED'
      } else {
        return 'PUBLISHED_ONGOING'
      }
    case 'ARCHIVED':
      return 'ARCHIVED'
    case 'DRAFT':
      return 'DRAFT'
    default:
      exhaustiveGuard(poll.status)
  }
}
