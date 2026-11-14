import { useCallback, useRef } from 'react'
import { BackHandler } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'

import { MiniAppWebView, MiniAppWebViewHandle } from '@app/components/mini-app/mini-app-web-view'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { useSession } from '@app/libs/auth'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'
import { VOLUNTEER_MINI_APP_SLUG } from '@app/utils/mini-app'

export default function VolunteerScreen() {
  const router = useRouter()
  const miniAppRef = useRef<MiniAppWebViewHandle>(null)
  const session = useSession()
  const insets = useSafeAreaInsets()
  // Set when a link or notification opens อาสาประชาชน at a page of its own.
  const { path } = useLocalSearchParams<{ path?: string }>()

  // Android back walks the mini app's own history first while this tab is
  // focused; once it has none, the default (tab/stack) behaviour applies.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => miniAppRef.current?.goBack() ?? false
      )
      return () => subscription.remove()
    }, [])
  )

  return (
    <SafeAreaLayout>
      <MiniAppWebView
        // The tab outlives sign-in and sign-out. Remounting on either drops
        // the previous user's session and opens the app afresh as the new one.
        key={session ? 'signed-in' : 'signed-out'}
        ref={miniAppRef}
        slug={VOLUNTEER_MINI_APP_SLUG}
        path={path}
        showTopBar={false}
        // iOS 26's native tab bar floats over the screen, so the page runs
        // under it. Each native tab screen has its own safe area provider,
        // whose bottom inset is the bar's height; the page lifts its own nav
        // by it. The JS tab bar elsewhere sits below the web view instead.
        bottomInset={supportsLiquidGlass ? insets.bottom : undefined}
        onClose={() => router.navigate('/')}
      />
    </SafeAreaLayout>
  )
}
