import { useCallback, useRef } from 'react'
import { BackHandler } from 'react-native'

import { useFocusEffect, useRouter } from 'expo-router'

import { MiniAppWebView, MiniAppWebViewHandle } from '@app/components/mini-app/mini-app-web-view'
import { SafeAreaLayout } from '@app/components/safe-area-layout'

// อาสาประชาชน — embedded as the อาสา tab instead of opened as a mini app screen.
export const VOLUNTEER_MINI_APP_SLUG = 'noble-aqua-dove'

export default function VolunteerScreen() {
  const router = useRouter()
  const miniAppRef = useRef<MiniAppWebViewHandle>(null)

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
        ref={miniAppRef}
        slug={VOLUNTEER_MINI_APP_SLUG}
        showTopBar={false}
        onClose={() => router.navigate('/')}
      />
    </SafeAreaLayout>
  )
}
