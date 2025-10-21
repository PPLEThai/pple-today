import { useEffect } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

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
      return
    }

    tokenExchangeMiniAppResult.mutateAsync({
      pathParams: { appId: electionId },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId, router])

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="pt-safe-offset-4 pb-2 px-4 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      <View className="flex-1">
        {tokenExchangeMiniAppResult.isPending ? (
          <LoadingPage />
        ) : !tokenExchangeMiniAppResult.isSuccess ? (
          <NotFound />
        ) : (
          <WebView
            className="border-8 border-red-600"
            userAgent={`PPLETodayApp/${Constants.expoConfig?.version ?? 'local'}`}
            source={{ uri: tokenExchangeMiniAppResult.data.url }}
          />
        )}
      </View>
    </View>
  )
}

export default MiniAppWebView
