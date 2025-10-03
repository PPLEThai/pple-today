import { Stack } from 'expo-router'

import { KeyboardAvoidingViewLayout } from '@app/components/keyboard-avoiding-view-layout'

export default function Layout() {
  return (
    <KeyboardAvoidingViewLayout>
      <Stack
        initialRouteName="index"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </KeyboardAvoidingViewLayout>
  )
}
