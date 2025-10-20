import { useEffect } from 'react'
import { WebView } from 'react-native-webview'

import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'

import NotFound from '@app/app/+not-found'
import LoadingPage from '@app/app/loading'
import { reactQueryClient } from '@app/libs/api-client'

const MiniAppWebView = () => {
  const router = useRouter()

  const params = useLocalSearchParams()
  const electionId = params.appId as string
  const tokenExchangeMiniAppResult = reactQueryClient.useMutation('post', '/auth/mini-app/:appId')

  useEffect(() => {
    if (!electionId) {
      router.dismissTo('/')
    }
  }, [electionId, router])

  useEffect(() => {
    if (!electionId) {
      return
    }

    tokenExchangeMiniAppResult.mutateAsync({
      pathParams: { appId: electionId },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId, router])

  if (tokenExchangeMiniAppResult.isPending) {
    return <LoadingPage />
  }

  if (!tokenExchangeMiniAppResult.isSuccess) {
    return <NotFound />
  }

  return (
    <WebView
      userAgent={`PPLETodayApp/${Constants.expoConfig?.version ?? 'local'}`}
      source={{ uri: tokenExchangeMiniAppResult.data.url }}
      startInLoadingState={true}
    />
  )
}

export default MiniAppWebView
