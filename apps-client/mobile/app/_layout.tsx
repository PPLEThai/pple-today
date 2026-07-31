import '../global.css'
import 'dayjs/locale/th'

import * as React from 'react'
import { PermissionsAndroid, Platform } from 'react-native'
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
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  requestPermission,
} from '@react-native-firebase/messaging'
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import duration from 'dayjs/plugin/duration'
import * as Clipboard from 'expo-clipboard'
import { useFonts } from 'expo-font'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { type Href, router, Stack, useRootNavigationState } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { InfoIcon } from 'lucide-react-native'

import { AppUpdateGate } from '@app/components/app-update-gate'
import { NotificationSenderIcon } from '@app/components/notification/sender-icon'
import { StatusBarProvider } from '@app/context/status-bar'
import { environment } from '@app/env'
import { useScreenTracking } from '@app/libs/analytics'
import { reactQueryClient } from '@app/libs/api-client'
import { initAppUpdate } from '@app/libs/app-update'
import { AuthLifeCycleHook, useAuthMe, useSession } from '@app/libs/auth'
import { parseBrandedPush, pushBadgeCount, pushSenderApp } from '@app/utils/branded-push'
import { openLink } from '@app/utils/link'
import { resolveIncomingDeepLinkPath } from '@app/utils/mini-app'

import { optimisticMarkAsRead } from './(tabs)/(feed)/notification'

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
                    <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
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

/**
 * Keeps the app icon badge (the red circle with a number) in sync with the
 * unread notification count. `/notifications/unread-count` is updated
 * optimistically on read and on incoming push messages, so this only needs
 * to mirror that query's value onto the native badge.
 */
function AppIconBadgeSync() {
  const session = useSession()
  const unreadNotificationCountQuery = reactQueryClient.useQuery(
    '/notifications/unread-count',
    {},
    { enabled: !!session }
  )
  const unreadCount = unreadNotificationCountQuery.data?.unreadCount

  React.useEffect(() => {
    if (!session) {
      Notifications.setBadgeCountAsync(0).catch(() => {})
      return
    }
    if (unreadCount !== undefined) {
      Notifications.setBadgeCountAsync(unreadCount).catch(() => {})
    }
  }, [session, unreadCount])

  return null
}

async function requestUserPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const requestResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    )

    return requestResult === PermissionsAndroid.RESULTS.GRANTED
  }

  if (Platform.OS === 'ios') {
    const authStatus = await requestPermission(messaging)
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL

    return enabled
  }

  throw new Error(`Unsupported platform: ${Platform.OS}`)
}

function NotificationTokenConsentPopup() {
  const registerNotificationTokenMutation = reactQueryClient.useMutation(
    'post',
    '/notifications/register',
    {}
  )
  const markAsReadMutation = reactQueryClient.useMutation('put', '/notifications/read/:id', {})
  const authMe = useAuthMe()

  // `Record<string, unknown>` rather than RNFB's own data type, because the same
  // handler now also receives the data off a notification this client presented,
  // which `expo-notifications` types as unknown values.
  const handleRemoteMessage = async (data: Record<string, unknown>) => {
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

        if (link.type && link.destination) {
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
  const lastNotificationResponse = Notifications.useLastNotificationResponse()
  React.useEffect(() => {
    if (Platform.OS !== 'android' || !lastNotificationResponse) return
    const data = lastNotificationResponse.notification.request.content.data
    // Cleared once handled so that a remount cannot replay a tap that has already
    // been navigated.
    Notifications.clearLastNotificationResponseAsync().catch(() => {})
    if (data) {
      handleRemoteMessage(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastNotificationResponse])

  React.useEffect(() => {
    const handleInitialMessaging = async () => {
      const remoteMessage = await getInitialNotification(messaging)

      if (remoteMessage && remoteMessage.data) {
        await handleRemoteMessage(remoteMessage.data)
      }
    }

    const registerNotification = async () => {
      try {
        if (!authMe.data) return

        const requestPermissionResult = await requestUserPermission()
        if (!requestPermissionResult) return

        const token = await getToken(messaging)

        await registerNotificationTokenMutation.mutateAsync({
          body: {
            deviceToken: token,
            // The server builds a different push payload per platform, so it has
            // to know which one this token belongs to.
            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
            // Asserts that this build can render an app-branded notification from
            // a data-only message. Only the Android path does — see
            // `registerBrandedPushBackgroundHandler` — and on iOS the server
            // brands the push itself, with no client involvement. Registration
            // already runs on every cold start after auth, so an upgraded install
            // re-asserts this without any new trigger.
            supportsAppBranding: Platform.OS === 'android',
          },
        })
        await handleInitialMessaging()
      } catch (err) {
        console.error('Failed to register notification token', JSON.stringify(err))
      }
    }

    registerNotification()

    const unsubscribeOpenedApp = onNotificationOpenedApp(messaging, async (remoteMessage) => {
      if (remoteMessage && remoteMessage.data) {
        await handleRemoteMessage(remoteMessage.data)
      }
    })

    const unsubscribeOnMessage = onMessage(messaging, async (remoteMessage) => {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMe.data])

  return null
}
