import { useCallback, useMemo, useRef } from 'react'
import { View } from 'react-native'

import { BottomSheetModal, BottomSheetView } from '@pple-today/ui/bottom-sheet/index'
import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'

export default function Blue() {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present()
  }, [])

  const snapPoints = useMemo(() => ['25%', '50%'], [])

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Button onPress={handlePresentModalPress}>
        <Text>Present Modal</Text>
      </Button>
      <BottomSheetModal ref={bottomSheetModalRef} snapPoints={snapPoints}>
        <BottomSheetView className="flex-1 items-center p-4">
          <Text className="text-7xl font-bold">Bottom Sheet Component 🎉</Text>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  )
}
