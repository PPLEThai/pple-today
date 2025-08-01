import { useState } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated'

// import { HelloWave } from '@/components/HelloWave'
// import ParallaxScrollView from '@/components/ParallaxScrollView'
// import { ThemedText } from '@/components/ThemedText'
// import { ThemedView } from '@/components/ThemedView'
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
        url="https://reactjs.org"
        onLoad={() => {}}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 250,
            width: '100%',
            // backgroundColor: 'red',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'box-only',
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
          <Text>{'Test\nTest\n'}</Text>
          <Button
            title={`test ${count}`}
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
        {/* <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Welcome!</ThemedText>
          <HelloWave />
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Step 1: Try it</ThemedText>
          <ThemedText>
            Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see
            changes. Press{' '}
            <ThemedText type="defaultSemiBold">
              {Platform.select({
                ios: 'cmd + d',
                android: 'cmd + m',
                web: 'F12',
              })}
            </ThemedText>{' '}
            to open developer tools.
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          <ThemedText>
            {`Tap the Explore tab to learn more about what's included in this starter app.`}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
          <ThemedText>
            {`When you're ready, run `}
            <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
            <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the
            current <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
            <ThemedText type="defaultSemiBold">app-example</ThemedText>.
          </ThemedText>
        </ThemedView> */}
        <View style={{ height: 1700 }} />
      </Animated.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
})
