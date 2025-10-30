import '../global.css'
import 'dayjs/locale/th'

import * as React from 'react'
import { Linking, PermissionsAndroid, Platform } from 'react-native'
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
import { Toaster } from '@pple-today/ui/toast'
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
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
import { Stack, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { openBrowserAsync } from 'expo-web-browser'

import { StatusBarProvider } from '@app/context/status-bar'
import { environment } from '@app/env'
import { reactQueryClient } from '@app/libs/api-client'
import { AuthLifeCycleHook, useAuthMe } from '@app/libs/auth'

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
          <NotificationTokenConsentPopup />
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

  // TODO: add a loading screen or spinner while fonts are loading
  if (!fontLoaded && !fontError) {
    return null
  }

  return children
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

function NotificationTokenConsentPopup() {
  const registerNotificationTokenMutation = reactQueryClient.useMutation(
    'post',
    '/notifications/register',
    {}
  )
  const user = useAuthMe()
  const router = useRouter()

  const handleRemoteMessage = async (data: Record<string, string | object>) => {
    const linkData = data['link']

    if (linkData) {
      try {
        const link = JSON.parse(linkData as string)
        if (link.type && link.value) {
          switch (link.type) {
            case 'MINI_APP':
              await openBrowserAsync(link.value)
              break
            case 'IN_APP_NAVIGATION':
              router.push(link.value)
              break
            case 'EXTERNAL_BROWSER':
              Linking.openURL(link.value as string)
              break
          }
        }
      } catch (err) {
        console.error('Failed to parse link data:', err)
      }
    }
  }

  React.useEffect(() => {
    const handleInitialMessaging = async () => {
      const remoteMessage = await getInitialNotification(messaging)

      if (remoteMessage && remoteMessage.data) {
        await handleRemoteMessage(remoteMessage.data)
      }
    }

    const registerNotification = async () => {
      try {
        if (!user.data) return

        const requestPermissionResult = await requestUserPermission()
        if (!requestPermissionResult) return

        const token = await getToken(messaging)

        await registerNotificationTokenMutation.mutateAsync({
          body: {
            deviceToken: token,
          },
        })
        await handleInitialMessaging()
      } catch (err) {
        console.error('Failed to register notification token', err)
      }
    }

    registerNotification()

    const unsubscribeOpenedApp = onNotificationOpenedApp(messaging, async (remoteMessage) => {
      if (remoteMessage && remoteMessage.data) {
        await handleRemoteMessage(remoteMessage.data)
      }
    })

    return unsubscribeOpenedApp
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.data])

  return null
}
