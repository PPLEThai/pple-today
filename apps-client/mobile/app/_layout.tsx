import '../global.css'
import 'dayjs/locale/th'

import * as React from 'react'
import { AppState, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DevToolsBubble } from 'react-native-react-query-devtools'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import {
  NotoSansThai_300Light,
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
} from '@expo-google-fonts/noto-sans-thai'
import {
  NotoSansThaiLooped_300Light,
  NotoSansThaiLooped_400Regular,
  NotoSansThaiLooped_500Medium,
  NotoSansThaiLooped_600SemiBold,
  NotoSansThaiLooped_700Bold,
} from '@expo-google-fonts/noto-sans-thai-looped'
import { BottomSheetModalProvider } from '@pple-today/ui/bottom-sheet/index'
import { NAV_THEME } from '@pple-today/ui/lib/constants'
import { PortalHost } from '@pple-today/ui/portal'
import { toast, Toaster } from '@pple-today/ui/toast'
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import duration from 'dayjs/plugin/duration'
import * as Clipboard from 'expo-clipboard'
import { useFonts } from 'expo-font'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { type Href, router, Stack, useRootNavigationState } from 'expo-router'
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from 'expo-router/react-navigation'
import * as SplashScreen from 'expo-splash-screen'
import { InfoIcon } from 'lucide-react-native'

import { AppUpdateGate } from '@app/components/app-update-gate'
import { NotificationSenderIcon } from '@app/components/notification/sender-icon'
import { NotificationSettingsPromptDialog } from '@app/components/notification/settings-prompt-dialog'
import { StatusBarProvider } from '@app/context/status-bar'
import { environment } from '@app/env'
import { useScreenTracking } from '@app/libs/analytics'
import { reactQueryClient } from '@app/libs/api-client'
import { initAppUpdate } from '@app/libs/app-update'
import { AuthLifeCycleHook, useAuthMe, useSession } from '@app/libs/auth'
import { useFacebookConnectOutboxFlush } from '@app/libs/facebook-connect-attempt'
import { addLiveActivityRegistrationListener } from '@app/libs/live-activity'
import {
  addTrayActionListener,
  dismissTrayNotification,
  toTrayResponseInput,
} from '@app/libs/notification-display'
import {
  claimSettingsPrompt,
  consumeAppLinkOpen,
  type DeviceRegistrationResult,
  hasPromptedThisProcess,
  noteOpenedByUrl,
  registerDevice,
} from '@app/libs/notification-registration'
import { parseBrandedPush, pushBadgeCount, pushSenderApp } from '@app/utils/branded-push'
import { openLink } from '@app/utils/link'
import { resolveIncomingDeepLinkPath } from '@app/utils/mini-app'
import {
  DEFAULT_ACTION_IDENTIFIER,
  parseDismiss,
  pendingActionFromResponse,
  TRAY_RESULT_CATEGORY,
} from '@app/utils/tray-interaction'

import {
  infiniteNotificationsQueryOptions,
  optimisticMarkAsRead,
} from './(tabs)/(feed)/notification'

dayjs.extend(buddhistEra)
dayjs.extend(duration)
dayjs.locale('th')

SplashScreen.preventAutoHideAsync()

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
}
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

const messaging = getMessaging()

initAppUpdate()

const queryClient = new QueryClient()
// Expo Router 58 replaced the Stack's `initialRouteName` with this: the screen
// placed below one opened by a deep link, so back has somewhere to go.
export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  return (
    <>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBarProvider>
            <ColorSchemeProvider>
              <FontProvider>
                <GestureHandlerRootView>
                  <BottomSheetModalProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="loading" options={{ gestureEnabled: false }} />
                    </Stack>
                    <InitialDeepLinkHandler />
                    <Toaster />
                  </BottomSheetModalProvider>
                </GestureHandlerRootView>
              </FontProvider>
            </ColorSchemeProvider>
          </StatusBarProvider>
          {(environment.EXPO_PUBLIC_APP_ENVIRONMENT === 'development' ||
            environment.EXPO_PUBLIC_APP_ENVIRONMENT === 'local') && (
            <DevToolsBubble onCopy={onCopy} queryClient={queryClient} />
          )}
          <AuthLifeCycleHook />
          <AnalyticsScreenTracker />
          <FacebookConnectOutboxFlush />
          <NotificationTokenConsentPopup />
          <AppIconBadgeSync />
          <AppUpdateGate />
        </QueryClientProvider>
      </SafeAreaProvider>
      <PortalHost />
    </>
  )
}

const onCopy = async (text: string) => {
  try {
    await Clipboard.setStringAsync(text)
    return true
  } catch {
    return false
  }
}

function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansThai_300Light,
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold,
    NotoSansThaiLooped_300Light,
    NotoSansThaiLooped_400Regular,
    NotoSansThaiLooped_500Medium,
    NotoSansThaiLooped_600SemiBold,
    NotoSansThaiLooped_700Bold,
  })
  React.useEffect(() => {
    if (fontLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontLoaded, fontError])

  // Keep the splash up (and the navigator unmounted) until fonts are ready.
  // Because the navigator is not mounted on cold start, expo-router drops the
  // initial deep-link URL; <InitialDeepLinkHandler /> replays it once the
  // navigator mounts. See https://docs.expo.dev/router/advanced/native-intent/
  if (!fontLoaded && !fontError) {
    return null
  }
  return children
}

/**
 * Replays the launch deep link on cold start.
 *
 * While fonts load, <FontProvider /> renders `null`, so the root navigator is
 * not mounted and expo-router discards the URL that launched the app. Once the
 * navigator is ready we read the initial URL ourselves and navigate to the
 * resolved mini-app route. Non-mini-app URLs resolve to `null` and are left for
 * expo-router / the notification handlers to deal with.
 */
function InitialDeepLinkHandler() {
  const navigationState = useRootNavigationState()
  const handledRef = React.useRef(false)

  React.useEffect(() => {
    // Wait until the root navigator is mounted, then run exactly once.
    if (!navigationState?.key || handledRef.current) return
    handledRef.current = true

    const handleInitialDeepLink = async () => {
      const url = await Linking.getInitialURL()
      if (!url) return

      const route = resolveIncomingDeepLinkPath(url)
      if (route) {
        router.push(route as Href)
      }
    }

    handleInitialDeepLink().catch((err) => {
      console.error('Failed to handle initial deep link', err)
    })
  }, [navigationState?.key])

  return null
}

function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  // Force light theme for now
  const isDarkColorScheme = false

  // Uncomment this if you want to use the system color scheme
  // const hasMounted = React.useRef(false)
  // const { colorScheme, isDarkColorScheme } = useColorScheme()
  // const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false)
  // useIsomorphicLayoutEffect(() => {
  //   if (hasMounted.current) {
  //     return
  //   }
  //   if (Platform.OS === 'web') {
  //     // Adds the background color to the html element to prevent white background on overscroll.
  //     document.documentElement.classList.add('bg-background')
  //   }
  //   setIsColorSchemeLoaded(true)
  //   hasMounted.current = true
  // }, [])
  // if (!isColorSchemeLoaded) {
  //   return null
  // }

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>{children}</ThemeProvider>
  )
}

// const useIsomorphicLayoutEffect =
//   Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

function AnalyticsScreenTracker() {
  useScreenTracking()
  return null
}

/** Sends Facebook connect-attempt traces an earlier failed send kept on the device. */
function FacebookConnectOutboxFlush() {
  useFacebookConnectOutboxFlush()
  return null
}

/**
 * Keeps the app icon badge (the red circle with a number) in sync with the
 * unread notification count. `/notifications/unread-count` is updated
 * optimistically on read and on incoming push messages; this mirrors that
 * query's value onto the native badge.
 *
 * The badge is also written from outside the app: APNs applies a push's
 * `aps.badge` while the app is in the background. So the count is refetched
 * whenever the app comes back to the foreground, and the badge is rewritten on
 * every fetch, not only when the count changes: a cached 0 that the server
 * confirms is still 0 must clear a badge APNs left at 1.
 */
function AppIconBadgeSync() {
  const session = useSession()
  const unreadNotificationCountQuery = reactQueryClient.useQuery(
    '/notifications/unread-count',
    {},
    { enabled: !!session }
  )
  const unreadCount = unreadNotificationCountQuery.data?.unreadCount
  const updatedAt = unreadNotificationCountQuery.dataUpdatedAt

  React.useEffect(() => {
    if (!session) {
      Notifications.setBadgeCountAsync(0).catch(() => {})
      return
    }
    if (unreadCount !== undefined) {
      Notifications.setBadgeCountAsync(unreadCount).catch(() => {})
    }
  }, [session, unreadCount, updatedAt])

  // React Query's focus refetch listens for the browser's visibility events,
  // which React Native never fires: without this, the count and the
  // notification list keep what they had when the app was last in front, and
  // only a relaunch (or the feed's pull-to-refresh) would bring them up to date.
  React.useEffect(() => {
    if (!session) return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/notifications/unread-count'),
      })
      queryClient.invalidateQueries({ queryKey: infiniteNotificationsQueryOptions.queryKey })
    })
    return () => subscription.remove()
  }, [session])

  return null
}

const LIVE_ACTIVITY_REREGISTER_DELAY_MS = 2000
/** Coming back to the foreground re-checks permission and the token, debounced. */
const FOREGROUND_RECHECK_DELAY_MS = 1000

/** An interactive push on iOS, whose taps `expo-notifications` routes instead of RNFB. */
const isIosInteractive = (data: Record<string, unknown>) =>
  Platform.OS === 'ios' && !!data['pple_interaction']

function NotificationTokenConsentPopup() {
  const registerNotificationTokenMutation = reactQueryClient.useMutation(
    'post',
    '/notifications/register',
    {}
  )
  const markAsReadMutation = reactQueryClient.useMutation('put', '/notifications/read/:id', {})
  const authMe = useAuthMe()
  const userId = authMe.data?.id
  const [settingsPromptOpen, setSettingsPromptOpen] = React.useState(false)

  // Permission check, then token registration (skipped when unchanged), then the
  // "notifications are off" dialog when the OS will no longer ask. See
  // `libs/notification-registration.ts`.
  const registerAndMaybeNudge = async (input: {
    mayPrompt: boolean
    openedByAppLink: boolean
  }): Promise<DeviceRegistrationResult | null> => {
    if (!userId) return null
    const result = await registerDevice({
      userId: String(userId),
      mayPrompt: input.mayPrompt || input.openedByAppLink,
      send: (body) => registerNotificationTokenMutation.mutateAsync({ body }),
    })
    if (await claimSettingsPrompt(result.permission, input.openedByAppLink)) {
      setSettingsPromptOpen(true)
    }
    return result
  }

  // PPLE ID's "เปิดการแจ้งเตือน" button opens the app with the bare
  // `pple-today://`: note it, so the next check may prompt or show the dialog.
  React.useEffect(() => {
    Linking.getInitialURL()
      .then(noteOpenedByUrl)
      .catch(() => {})
    const subscription = Linking.addEventListener('url', ({ url }) => noteOpenedByUrl(url))
    return () => subscription.remove()
  }, [])

  // Coming back to the foreground: a warm open from PPLE ID, or a return from
  // Settings with notifications now on, registers the token without a relaunch.
  // The OS prompt shows from here only if it hasn't this run (Android would
  // otherwise ask again after every refusal) or the app link asked for it.
  React.useEffect(() => {
    if (!userId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = AppState.addEventListener('change', (state) => {
      clearTimeout(timer)
      if (state !== 'active') return
      timer = setTimeout(() => {
        registerAndMaybeNudge({
          mayPrompt: !hasPromptedThisProcess(),
          openedByAppLink: consumeAppLinkOpen(),
        })
      }, FOREGROUND_RECHECK_DELAY_MS)
    })
    return () => {
      clearTimeout(timer)
      subscription.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // `Record<string, unknown>` rather than RNFB's own data type, because the same
  // handler now also receives the data off a notification this client presented,
  // which `expo-notifications` types as unknown values.
  //
  // `pendingActionId` is set when the user pressed a tray action that opens the app
  // (one with `confirm` or `requires`): the detail screen opens with that action
  // pending, instead of wherever `link` points.
  const handleRemoteMessage = async (data: Record<string, unknown>, pendingActionId?: string) => {
    const linkData = data['link']

    if (typeof linkData === 'string' && linkData) {
      try {
        const link = JSON.parse(linkData)
        const notificationId =
          (typeof data['notificationId'] === 'string' ? data['notificationId'] : undefined) ??
          (link.type === 'IN_APP_NAVIGATION' && link.destination?.inAppType === 'NOTIFICATION'
            ? link.destination.inAppId
            : undefined)

        if (notificationId) {
          optimisticMarkAsRead(queryClient, notificationId)
          markAsReadMutation.mutateAsync({ pathParams: { id: notificationId } })
        }

        if (pendingActionId && notificationId) {
          router.navigate({
            pathname: '/notification/[notificationId]',
            params: { notificationId, pendingActionId },
          })
        } else if (link.type && link.destination) {
          await openLink(link)
        }
      } catch (err) {
        console.error('Failed to parse link data:', err)
      }
    }
  }

  // A notification this client presented itself is not one Play services
  // displayed, so tapping it never reaches `onNotificationOpenedApp` — it comes
  // back through `expo-notifications` instead. The hook covers the cold-start case
  // too, and returns the same object until a *different* notification is tapped,
  // so this effect runs once per tap.
  //
  // Android only. There, `expo-notifications` yields the incoming message to RNFB
  // (`android:priority="-1"`) and so only ever reports responses for notifications
  // we built; on iOS it is the `UNUserNotificationCenter` delegate and would report
  // FCM-displayed ones as well, double-handling every tap.
  //
  // iOS joins in for the notifications RNFB cannot route: an interactive one, whose
  // action presses RNFB reports as a plain open, and the local notification that
  // reports a failed tray answer, which RNFB never sees. A background tray action
  // is submitted natively (`modules/notification-actions`) and is ignored here.
  const lastNotificationResponse = Notifications.useLastNotificationResponse()
  React.useEffect(() => {
    if (!lastNotificationResponse) return
    const input = toTrayResponseInput(lastNotificationResponse)
    const data = input.data
    const isIosTray =
      Platform.OS === 'ios' &&
      (input.categoryIdentifier === TRAY_RESULT_CATEGORY || !!data?.['pple_interaction'])
    if (Platform.OS !== 'android' && !isIosTray) return
    // Cleared once handled so that a remount cannot replay a tap that has already
    // been navigated.
    Notifications.clearLastNotificationResponseAsync().catch(() => {})
    // A tray action that is submitted in the background (Android: the task or
    // listener; iOS: native) must not also navigate.
    const pendingActionId = pendingActionFromResponse(input)
    if (input.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER && !pendingActionId) return
    if (data) {
      handleRemoteMessage(data, pendingActionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastNotificationResponse])

  React.useEffect(() => {
    const handleInitialMessaging = async () => {
      const remoteMessage = await getInitialNotification(messaging)

      // iOS routes interactive notifications through `expo-notifications`, which
      // can tell a body tap from an action press; RNFB cannot.
      if (remoteMessage && remoteMessage.data && !isIosInteractive(remoteMessage.data)) {
        await handleRemoteMessage(remoteMessage.data)
      }
    }

    // Registers (or re-registers) this device's token. Returns whether the
    // server holds it. Launch may show the OS prompt, as it always has.
    const register = async (mayPrompt = true) => {
      const result = await registerAndMaybeNudge({
        mayPrompt,
        openedByAppLink: consumeAppLinkOpen(),
      })
      return result?.registered ?? false
    }

    const registerNotification = async () => {
      if (await register()) {
        await handleInitialMessaging()
      }
    }

    registerNotification()

    // The push-to-start token arrives (or rotates) after launch, and the user can
    // switch Live Activities off in Settings: tell the server, debounced.
    let reRegisterTimer: ReturnType<typeof setTimeout> | undefined
    const liveActivitySubscription = addLiveActivityRegistrationListener(() => {
      clearTimeout(reRegisterTimer)
      reRegisterTimer = setTimeout(() => {
        register(false)
      }, LIVE_ACTIVITY_REREGISTER_DELAY_MS)
    })

    const unsubscribeOpenedApp = onNotificationOpenedApp(messaging, async (remoteMessage) => {
      if (remoteMessage && remoteMessage.data && !isIosInteractive(remoteMessage.data)) {
        await handleRemoteMessage(remoteMessage.data)
      }
    })

    const unsubscribeTrayActions = addTrayActionListener()

    const unsubscribeOnMessage = onMessage(messaging, async (remoteMessage) => {
      // Another device answered: take the card out of this device's tray.
      const dismissId = parseDismiss(remoteMessage.data)
      if (dismissId) {
        await dismissTrayNotification(dismissId)
        return
      }
      // An attributed Android push arrives data-only — Play services must not
      // display it, or there would be nothing left for the client to brand — so
      // its title and body are in `data` rather than in a `notification` block.
      const brandedPush = parseBrandedPush(remoteMessage.data)
      const title = remoteMessage.notification?.title ?? brandedPush?.title
      const body = remoteMessage.notification?.body ?? brandedPush?.body
      // Both platforms name the sending app in `data`, so the toast brands the
      // same notification the tray does. Otherwise one notification would look
      // like two different senders depending on whether the app was open.
      const senderApp = pushSenderApp(remoteMessage.data)

      // The push states the recipient's unread total; incrementing is only the
      // fallback for a payload that carries none. The count feeds the app icon
      // badge as well as the in-app bell (see `AppIconBadgeSync`), so taking the
      // server's number keeps a device that missed a push — or one of several
      // signed in to the same account — from settling on its own private total.
      const badgeCount = pushBadgeCount(remoteMessage.data)
      queryClient.setQueryData(
        reactQueryClient.getQueryKey('/notifications/unread-count'),
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            unreadCount: badgeCount ?? oldData.unreadCount + 1,
          }
        }
      )

      // The notification is already in the history: show it there too, rather
      // than only bumping the count above the list.
      queryClient.invalidateQueries({ queryKey: infiniteNotificationsQueryOptions.queryKey })

      toast.info({
        text1: title,
        text2: body,
        // An attributed notification never falls back to the platform's own
        // glyph, even when the app has no icon to show: that would read as PPLE
        // Today having sent it. `NotificationSenderIcon` picks the neutral app
        // mark in that case, the same as the list and detail screens.
        icon: senderApp ? null : InfoIcon,
        leading: senderApp ? <NotificationSenderIcon app={senderApp} size={26} /> : undefined,
        onPress: async () => {
          if (remoteMessage && remoteMessage.data) {
            await handleRemoteMessage(remoteMessage.data)
            toast.hide()
          }
        },
      })
    })

    return () => {
      unsubscribeOpenedApp()
      unsubscribeOnMessage()
      unsubscribeTrayActions.remove()
      clearTimeout(reRegisterTimer)
      liveActivitySubscription.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMe.data])

  return (
    <NotificationSettingsPromptDialog
      open={settingsPromptOpen}
      onOpenChange={setSettingsPromptOpen}
    />
  )
}
