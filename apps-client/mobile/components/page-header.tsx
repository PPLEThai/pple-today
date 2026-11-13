import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { Stack, useRouter } from 'expo-router'
import { LucideIcon } from 'lucide-react-native'

import { BackButton } from '@app/components/back-button'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'

interface HeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  onBack?: () => void
}

export function PageHeader(props: HeaderProps) {
  if (supportsLiquidGlass) {
    return <NativePageHeader {...props} />
  }

  return <JsPageHeader {...props} />
}

const PRIMARY_COLOR = '#FF6A13' // base-primary-default

// UINavigationBar's height on iPhone in portrait (the app is portrait-only).
const NAVIGATION_BAR_HEIGHT = 44

/**
 * Top padding for the list of a screen with <PageHeader />: on iOS 26 the list
 * scrolls under the native header, so it has to start below it. 0 elsewhere.
 *
 * Not `useHeaderHeight()`: the native stack never reports this header's height,
 * so it stays 0.
 */
export function usePageHeaderInset() {
  const insets = useSafeAreaInsets()
  return supportsLiquidGlass ? insets.top + NAVIGATION_BAR_HEIGHT : 0
}

/**
 * iOS 26: shows the stack's native navigation bar, so the back button is a
 * Liquid Glass button and the swipe-back gesture matches the system. The screen
 * scrolls under the bar and iOS blurs it at the top edge (this needs our
 * react-native-screens patch), so pad the screen's list with
 * `usePageHeaderInset()` to start it below the bar.
 */
function NativePageHeader(props: HeaderProps) {
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title: props.title,
        headerTitle: () => (
          <View className="flex flex-col items-center">
            <View className="flex flex-row items-center gap-1.5">
              <Icon icon={props.icon} size={20} className="text-base-primary-default" />
              <Text
                className="font-heading-semibold text-lg text-base-primary-default"
                // The native bar is a fixed 44pt and doesn't grow for a custom title.
                maxFontSizeMultiplier={1}
              >
                {props.title}
              </Text>
            </View>
            {props.subtitle && (
              <Text
                className="-mt-1 text-xs text-base-text-medium font-heading-regular"
                maxFontSizeMultiplier={1}
              >
                {props.subtitle}
              </Text>
            )}
          </View>
        ),
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: PRIMARY_COLOR,
        // The default soft edge only fades a thin band; the list would show
        // through our two-line title. Hard draws a solid backing under the bar.
        scrollEdgeEffects: { top: 'hard' },
      }}
    />
  )
}

function JsPageHeader(props: HeaderProps) {
  const router = useRouter()

  return (
    <View className="p-4 pt-safe-offset-4 flex flex-row justify-between items-center bg-base-bg-white">
      <BackButton
        onPress={() => {
          router.back()
        }}
        aria-label="กลับ"
      />
      <View className="flex flex-col gap-1 items-end">
        <View className="inline-flex flex-row justify-center gap-2 items-center">
          <Icon icon={props.icon} size={32} className="text-base-primary-default align-middle" />
          <H1 className="font-heading-semibold text-3xl text-base-primary-default">
            {props.title}
          </H1>
        </View>
        {props.subtitle && (
          <Text className="text-base-text-medium text-base font-heading-regular">
            {props.subtitle}
          </Text>
        )}
      </View>
    </View>
  )
}
