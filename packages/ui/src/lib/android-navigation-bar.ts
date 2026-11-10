import { Platform } from 'react-native'

import { NavigationBar } from 'expo-navigation-bar'

export function setAndroidNavigationBar(theme: 'light' | 'dark') {
  if (Platform.OS !== 'android') return
  // Edge-to-edge (mandatory since Expo SDK 55) draws the navigation bar over the
  // app's own background, so there is no bar colour left to set, only its buttons.
  NavigationBar.setStyle(theme === 'dark' ? 'light' : 'dark')
}
