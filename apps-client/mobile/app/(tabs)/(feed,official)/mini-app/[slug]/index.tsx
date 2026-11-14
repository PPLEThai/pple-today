import { View } from 'react-native'

import { useLocalSearchParams, useRouter } from 'expo-router'

import { useTabBarOverlap } from '@app/components/glass-tab-bar'
import { MiniAppWebView } from '@app/components/mini-app/mini-app-web-view'

const MiniAppScreen = () => {
  const router = useRouter()
  const tabBarOverlap = useTabBarOverlap()

  const params = useLocalSearchParams()
  const slug = params.slug as string
  const path = params.path as string | undefined

  const closeMiniApp = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.dismissTo('/')
    }
  }

  // Pages here are built by other teams and cannot be relied on to leave room
  // for our tab bar (only อาสาประชาชน reads `--pple-today-inset-bottom`). So the
  // web view ends where the bar begins — above iOS 26's floating bar, which
  // would cover it otherwise — and a border keeps a page that ends in white
  // from running into the bar.
  return (
    <View className="flex-1 bg-base-bg-default" style={{ paddingBottom: tabBarOverlap }}>
      <View className="flex-1 border-b border-base-outline-default">
        <MiniAppWebView slug={slug} path={path} onClose={closeMiniApp} />
      </View>
    </View>
  )
}

export default MiniAppScreen
