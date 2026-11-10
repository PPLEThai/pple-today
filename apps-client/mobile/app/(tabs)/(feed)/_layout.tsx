import { Stack } from 'expo-router'

// Expo Router 58 replaced the Stack's `initialRouteName` with this: the screen
// placed below one opened by a deep link, so back has somewhere to go.
export const unstable_settings = {
  anchor: 'index',
}

export default function FeedLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
