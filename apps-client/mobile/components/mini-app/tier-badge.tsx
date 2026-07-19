import { Badge } from '@pple-today/ui/badge'
import { Text } from '@pple-today/ui/text'

import { MiniApp } from '@api/backoffice/app'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

/**
 * Marks an app that is not yet published to everyone.
 *
 * A Builder's own Draft app sits in the grid alongside their real apps, and a
 * Beta tester's invited app does too — the badge is how either of them tells
 * the two apart, without a separate developer menu. LIVE apps, which is nearly
 * all of them, render nothing.
 */
export function MiniAppTierBadge({ tier }: { tier: MiniApp['tier'] }) {
  const label = getMiniAppTierLabel(tier)

  if (!label) {
    return null
  }

  return (
    <Badge variant="secondary" className="mt-1">
      <Text>{label}</Text>
    </Badge>
  )
}

export function getMiniAppTierLabel(tier: MiniApp['tier']) {
  switch (tier) {
    case 'DRAFT':
      return 'ฉบับร่าง'
    case 'BETA':
      return 'ทดลองใช้'
    case 'LIVE':
      // The ordinary case carries no label.
      return null
    default:
      exhaustiveGuard(tier)
  }
}
