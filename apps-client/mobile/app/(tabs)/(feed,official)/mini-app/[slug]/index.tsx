import { useLocalSearchParams, useRouter } from 'expo-router'

import { MiniAppWebView } from '@app/components/mini-app/mini-app-web-view'

const MiniAppScreen = () => {
  const router = useRouter()

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

  return <MiniAppWebView slug={slug} path={path} onClose={closeMiniApp} />
}

export default MiniAppScreen
