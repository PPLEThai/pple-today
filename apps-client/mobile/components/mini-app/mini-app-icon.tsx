import { View } from 'react-native'

import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { Image } from 'expo-image'

import { monogramColor, monogramLetter } from '@app/utils/apps-tab'

export function isImageUri(url: string | null | undefined): url is string {
  if (!url) return false
  return url.startsWith('https://') || url.startsWith('data:image/')
}

const SIZES = {
  md: { box: 'h-16 w-16 rounded-2xl', image: 'w-16 h-16', letter: 'text-2xl' },
  sm: { box: 'h-12 w-12 rounded-xl', image: 'w-12 h-12', letter: 'text-xl' },
} as const

/**
 * An app's icon, or — when it has none — its first letter on a colour drawn
 * from its slug, so apps without icons stop looking identical.
 */
export function MiniAppIcon({
  iconUrl,
  name,
  slug,
  size = 'md',
  className,
}: {
  iconUrl: string | null
  name: string
  slug: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const sizing = SIZES[size]

  if (isImageUri(iconUrl)) {
    return (
      <View
        className={cn('overflow-hidden border border-base-outline-default', sizing.box, className)}
      >
        <Image source={{ uri: iconUrl }} contentFit="contain" className={sizing.image} />
      </View>
    )
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('items-center justify-center', sizing.box, className)}
      style={{ backgroundColor: monogramColor(slug) }}
    >
      <Text className={cn('font-heading-bold text-base-bg-white', sizing.letter)}>
        {monogramLetter(name)}
      </Text>
    </View>
  )
}
