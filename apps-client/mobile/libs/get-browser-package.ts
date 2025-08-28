import { Platform } from 'react-native'

import * as WebBrowser from 'expo-web-browser'

export async function getBrowserPackage() {
  try {
    // when default browser is not chrome on Android it will throw an error `No matching browser activity found`
    // we can use `WebBrowser.getCustomTabsSupportingBrowsersAsync()` to get the preferred browser package or list service packages
    // TODO: error when chrome is not installed
    if (Platform.OS === 'android') {
      const { preferredBrowserPackage, servicePackages } =
        await WebBrowser.getCustomTabsSupportingBrowsersAsync()
      return preferredBrowserPackage ?? servicePackages[0]
    }
  } catch (error) {
    console.warn('Error getting browser package:', error)
    return undefined
  }
}
