import { Badge } from '@pple-today/web-ui/badge'

import { ElectionStatus } from '@api/backoffice/admin'

import { exhaustiveGuard } from '../../../../packages/api-common/src/utils/common'

export default function ElectionStatusBadge({ status }: { status: ElectionStatus }) {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="outline">ร่าง</Badge>
    case 'NOT_OPENED_VOTE':
      return <Badge variant="secondary">ยังไม่เปิดหีบ</Badge>
    case 'OPEN_VOTE':
      return <Badge variant="success">เปิดหีบ</Badge>
    case 'CLOSED_VOTE':
      return <Badge variant="destructive">ปิดหีบ</Badge>
    case 'RESULT_ANNOUNCE':
      return <Badge variant="default">ประกาศผล</Badge>
    default:
      exhaustiveGuard(status)
  }
}
