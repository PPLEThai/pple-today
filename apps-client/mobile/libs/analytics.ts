import { useEffect, useRef } from 'react'

import { getAnalytics, logScreenView } from '@react-native-firebase/analytics'
import { usePathname, useSegments } from 'expo-router'

const analytics = getAnalytics()

function getScreenName(segments: string[]): string {
  const filtered = segments.filter((s) => !s.startsWith('(') || !s.endsWith(')'))
  return filtered.length > 0 ? filtered.join('/') : 'index'
}

export function useScreenTracking() {
  const pathname = usePathname()
  const segments = useSegments()
  const previousPathname = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === previousPathname.current) return
    previousPathname.current = pathname

    const screenName = getScreenName(segments)

    logScreenView(analytics, {
      screen_name: screenName,
      screen_class: screenName,
    }).catch((err: unknown) => {
      console.warn('[Analytics] Failed to log screen view:', err)
    })
  }, [pathname, segments])
}
