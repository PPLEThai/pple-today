import { Badge } from '@pple-today/ui/badge'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'

import { MiniApp } from '@api/backoffice/app'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

/**
 * Marks an app that is not yet published to everyone.
 *
 * Draft and Beta apps no longer share the grid with the party's apps — they
 * sit in "แอปที่ฉันกำลังสร้าง" and "แอปที่ได้รับเชิญให้ทดลองใช้" — so the badge sits
 * on its own line under the app's name rather than over its icon. LIVE apps, which is
 * nearly all of them, render nothing.
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
    <Badge
      className={cn('h-5 justify-center border-transparent px-2 py-0', badge.className, className)}
    >
      {/* Thai glyphs sit high in the line box; nudge the label down to look centred. */}
      <Text className="relative top-0.5 text-xs text-base-bg-white font-heading-bold">
        {badge.label}
      </Text>
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
      // PPLE Platform's word for the Beta tier (CONTEXT.md, Thai renderings).
      return { label: 'ทดลองใช้', className: 'bg-system-info-default' }
    case 'LIVE':
      // The ordinary case carries no badge.
      return null
    default:
      exhaustiveGuard(tier)
  }
}
