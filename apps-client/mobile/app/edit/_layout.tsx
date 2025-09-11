import { SafeAreaView } from 'react-native-safe-area-context'

import { Stack } from 'expo-router'

import { EditingProvider } from '@app/contexts/profile-context'

export default function EditingLayout() {
  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
      <EditingProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="edit-address" options={{ headerShown: false }} />
        </Stack>
      </EditingProvider>
    </SafeAreaView>
  )
}
