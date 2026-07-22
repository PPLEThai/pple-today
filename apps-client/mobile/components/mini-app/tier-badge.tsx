import { Badge } from '@pple-today/ui/badge'
import { Text } from '@pple-today/ui/text'

import { cn } from '@pple-today/ui/lib/utils'

import { MiniApp } from '@api/backoffice/app'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

/**
 * Marks an app that is not yet published to everyone.
 *
 * A Builder's own Draft app sits in the grid alongside their real apps, and a
 * Beta tester's invited app does too — the badge is how either of them tells
 * the two apart, without a separate developer menu. LIVE apps, which is nearly
 * all of them, render nothing.
 *
 * The badge has a fixed h-6 height so a caller can overlap it on the icon's top
 * edge with a deterministic offset (see the official app grid).
 */
export function MiniAppTierBadge({
  tier,
  className,
}: {
  tier: MiniApp['tier']
  className?: string
}) {
  const badge = getMiniAppTierBadge(tier)

  if (!badge) {
    return null
  }

  return (
    <Badge className={cn('h-6 justify-center border-transparent px-2 py-0', badge.className, className)}>
      <Text className="text-base-bg-white font-heading-bold">{badge.label}</Text>
    </Badge>
  )
}

function getMiniAppTierBadge(tier: MiniApp['tier']) {
  switch (tier) {
    case 'DRAFT':
      // Red pill: an unpublished draft.
      return { label: 'ฉบับร่าง', className: 'bg-system-danger-default' }
    case 'BETA':
      // Blue pill: an invited beta test.
      return { label: 'ทดลอง', className: 'bg-system-info-default' }
    case 'LIVE':
      // The ordinary case carries no badge.
      return null
    default:
      exhaustiveGuard(tier)
  }
}
