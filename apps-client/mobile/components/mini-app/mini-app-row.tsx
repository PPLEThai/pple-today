import { Pressable, View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { ChevronRightIcon } from 'lucide-react-native'

import { MiniAppIcon } from './mini-app-icon'
import { MiniAppTierBadge } from './tier-badge'
import type { MiniAppListItem } from './use-mini-app-list'

/** One app as a list row: icon, name, tier badge on its own line, and tagline when it has one. */
export function MiniAppRow({
  app,
  onPress,
  showDivider,
  showTierBadge = true,
  highlighted = false,
}: {
  app: MiniAppListItem
  onPress: () => void
  showDivider: boolean
  /** Off where a heading already names the tier. */
  showTierBadge?: boolean
  /** Draws the eye to an app that just arrived (an accepted invite). */
  highlighted?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex flex-row items-center gap-3 px-4 py-3 active:opacity-50',
        showDivider && 'border-t border-base-outline-default',
        highlighted && 'bg-base-primary-light/20'
      )}
    >
      <MiniAppIcon iconUrl={app.iconUrl} name={app.name} slug={app.slug} size="sm" />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={2} className="font-heading-semibold text-base-text-high">
          {app.name}
        </Text>
        {/* On its own line, so the badge never squeezes the app's name. Live
            apps carry no badge and the row stays two lines at most. */}
        {showTierBadge && app.tier !== 'LIVE' && (
          <View className="flex flex-row">
            <MiniAppTierBadge tier={app.tier} />
          </View>
        )}
        {app.tagline ? (
          <Text numberOfLines={1} className="text-sm font-heading-regular text-base-text-medium">
            {app.tagline}
          </Text>
        ) : null}
      </View>
      <Icon icon={ChevronRightIcon} size={20} className="text-base-text-medium" />
    </Pressable>
  )
}
