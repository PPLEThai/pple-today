import '../global.css'

import * as React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DevToolsBubble } from 'react-native-react-query-devtools'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Inter_300Light, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter'
import {
  NotoSansThaiLooped_300Light,
  NotoSansThaiLooped_500Medium,
  NotoSansThaiLooped_700Bold,
} from '@expo-google-fonts/noto-sans-thai-looped'
import { BottomSheetModalProvider } from '@pple-today/ui/bottom-sheet/index'
import { NAV_THEME } from '@pple-today/ui/lib/constants'
import { PortalHost } from '@pple-today/ui/portal'
import { Toaster } from '@pple-today/ui/toast'
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'

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

const queryClient = new QueryClient()
export default function RootLayout() {
  return (
    <>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ColorSchemeProvider>
            <FontProvider>
              <GestureHandlerRootView>
                <BottomSheetModalProvider>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  </Stack>
                  <Toaster />
                </BottomSheetModalProvider>
              </GestureHandlerRootView>
            </FontProvider>
          </ColorSchemeProvider>
          <DevToolsBubble onCopy={onCopy} queryClient={queryClient} />
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
    Inter_300Light,
    Inter_500Medium,
    Inter_700Bold,
    NotoSansThaiLooped_300Light,
    NotoSansThaiLooped_500Medium,
    NotoSansThaiLooped_700Bold,
    Anakotmai_300Light: require('../assets/fonts/Anakotmai-Light.otf'),
    Anakotmai_500Medium: require('../assets/fonts/Anakotmai-Medium.otf'),
    Anakotmai_700Bold: require('../assets/fonts/Anakotmai-Bold.otf'),
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
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  )
}

// const useIsomorphicLayoutEffect =
//   Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect
