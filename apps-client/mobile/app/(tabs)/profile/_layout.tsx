import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="facebook" />
      <Stack.Screen name="follow" />
    </Stack>
  )
}
