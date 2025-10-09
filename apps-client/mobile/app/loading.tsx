import { View } from 'react-native'

import { Spinner } from '@app/components/spinner'

export default function LoadingPage() {
  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <Spinner />
    </View>
  )
}
