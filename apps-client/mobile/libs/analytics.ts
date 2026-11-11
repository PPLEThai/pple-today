import { useEffect, useRef } from 'react'

import { getAnalytics, logEvent } from '@react-native-firebase/analytics'
import { useRootNavigationState, useSegments } from 'expo-router'

const analytics = getAnalytics()

export function useScreenTracking() {
  const segments = useSegments()
  const navigationState = useRootNavigationState()
  const previousScreen = useRef<string | null>(null)

  useEffect(() => {
    if (!navigationState?.key) return

    const screenName =
      segments
        .filter((s) => s !== '(tabs)')
        .map((s) => s.replace(/[()]/g, ''))
        .join('/') || 'home'

    if (screenName === previousScreen.current) return
    previousScreen.current = screenName

    // Synchronous since React Native Firebase 26: it returns nothing to catch.
    logEvent(analytics, 'screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    })

    if (__DEV__) {
      console.log(`[Analytics] 🚀 Tracked: ${screenName}`)
    }
  }, [segments, navigationState])
}
