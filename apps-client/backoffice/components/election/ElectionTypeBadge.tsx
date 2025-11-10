import { Badge } from '@pple-today/web-ui/badge'

import { ElectionInfo } from '@api/backoffice/admin'

import { exhaustiveGuard } from '~/libs/exhaustive-guard'

export default function ElectionTypeBadge({ type }: { type: ElectionInfo['type'] }) {
  switch (type) {
    case 'ONSITE':
      return <Badge variant="default">ในสถานที่</Badge>
    case 'ONLINE':
      return <Badge variant="default">ออนไลน์</Badge>
    case 'HYBRID':
      return <Badge variant="default">ผสม</Badge>
    default:
      exhaustiveGuard(type)
  }
}
