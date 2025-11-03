import { Badge } from '@pple-today/web-ui/badge'
import { AdminElectionInfo } from 'node_modules/@api/backoffice/src/modules/admin/election/models'

import { exhaustiveGuard } from '~/libs/exhaustive-guard'

export default function ElectionKeyStatusBadge({
  status,
}: {
  status: AdminElectionInfo['keyStatus']
}) {
  switch (status) {
    case 'PENDING_CREATED':
      return <Badge className="bg-system-warning-default text-white">กำลังสร้างข้อมูล</Badge>
    case 'CREATED':
      return <Badge variant="success">พร้อมประกาศ</Badge>
    case 'FAILED_CREATED':
      return <Badge variant="destructive">มีข้อผิดพลาด</Badge>
    case 'NOT_CREATED':
    case 'DESTROY_SCHEDULED':
      return null
    default:
      return exhaustiveGuard(status)
  }
}
