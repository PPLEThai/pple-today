import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="facebook" options={{ headerShown: false }} />
      <Stack.Screen name="follow" options={{ headerShown: false }} />
    </Stack>
  )
}
