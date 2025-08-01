import { useState } from 'react'
import { Button, Text, View } from 'react-native'
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated'

import { ExpoScrollPassthroughView } from 'expo-scroll-passthrough'

const AnimatedExpoScrollPassthroughView =
  Animated.createAnimatedComponent(ExpoScrollPassthroughView)

export default function HomeScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const scrollOffset = useScrollViewOffset(scrollRef)
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollOffset.value }],
  }))

  const [count, setCount] = useState(0)

  return (
    <View>
      <AnimatedExpoScrollPassthroughView
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 250,
            width: '100%',
            backgroundColor: 'red',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          },
          headerAnimatedStyle,
        ]}
      >
        <View
          style={{
            height: 250,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text>{'Test\nTest'}</Text>
          <Button
            title={`test 100 ${count}`}
            onPress={() => {
              setCount((count) => count + 1)
            }}
          />
        </View>
      </AnimatedExpoScrollPassthroughView>
      <Animated.ScrollView ref={scrollRef} style={{ paddingTop: 250 }}>
        <Button
          title={`test ${count}`}
          onPress={() => {
            setCount((count) => count + 1)
          }}
        />
        <View style={{ height: 1700 }} />
      </Animated.ScrollView>
    </View>
  )
}
