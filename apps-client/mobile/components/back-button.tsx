import { Pressable } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { GlassView } from 'expo-glass-effect'
import { ArrowLeftIcon, ChevronLeftIcon } from 'lucide-react-native'

import { supportsLiquidGlass } from '@app/utils/liquid-glass'

interface BackButtonProps {
  onPress: () => void
  'aria-label'?: string
}

/**
 * The back button for screens that draw their own header. On iOS 26 it is a
 * Liquid Glass circle with a chevron, like the system navigation bar's back
 * button; elsewhere the outlined arrow button.
 */
export function BackButton({ onPress, 'aria-label': ariaLabel = 'กลับ' }: BackButtonProps) {
  if (supportsLiquidGlass) {
    return (
      <Pressable onPress={onPress} aria-label={ariaLabel} accessibilityRole="button" hitSlop={8}>
        <GlassView
          glassEffectStyle="regular"
          isInteractive
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon icon={ChevronLeftIcon} size={26} strokeWidth={2} className="text-base-text-high" />
        </GlassView>
      </Pressable>
    )
  }

  return (
    <Button variant="outline-primary" size="icon" onPress={onPress} aria-label={ariaLabel}>
      <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
    </Button>
  )
}
