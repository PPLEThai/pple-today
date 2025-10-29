import { useEffect } from 'react'
import { BackHandler, View } from 'react-native'

import { Spinner } from '@app/components/spinner'

export default function LoadingPage() {
  useEffect(() => {
    // block back button on android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true
    })
    return () => backHandler.remove()
  }, [])
  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <Spinner />
    </View>
  )
}
