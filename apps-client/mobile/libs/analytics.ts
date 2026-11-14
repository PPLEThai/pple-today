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

/** Where on the แอปฯ tab an app was opened from. */
export type MiniAppOpenSource = 'grid' | 'recents' | 'search' | 'beta' | 'draft'

/**
 * Which entry points people actually use — the data the later, data-gated
 * phases of the แอปฯ redesign wait for. Carries the app, never the person.
 */
export function logMiniAppOpen(slug: string, source: MiniAppOpenSource) {
  logEvent(analytics, 'mini_app_open', { slug, source })
}

/**
 * A search on the แอปฯ tab that found nothing, so admins can add the words
 * people use as keywords. Queries in a party app are sensitive, so this
 * carries the text alone — no person, role, or user id.
 */
export function logMiniAppSearchMiss(query: string) {
  logEvent(analytics, 'mini_app_search_miss', { query: query.slice(0, 100) })
}

/** How many Live apps a role sees, to tell when search and recents matter. */
export function logAppsTabViewed(liveCount: number) {
  logEvent(analytics, 'apps_tab_view', { live_count: liveCount })
}
