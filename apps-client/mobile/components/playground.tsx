import { Platform, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { ThemeToggle } from '@pple-today/ui/components/theme-toggle'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'

export function Playground() {
  return (
    <View className="flex flex-col gap-4 w-full font-sans">
      <View className="flex flex-row items-center justify-between">
        <H1>Playground</H1>
        <ThemeToggle />
      </View>
      <View className="flex flex-col gap-2">
        <Text>สวัสดี</Text>
        <Text
          style={{
            fontFamily: Platform.select({
              android: 'NotoSansThaiLooped_400Regular',
              ios: 'NotoSansThaiLooped-Regular',
            }),
          }}
        >
          สวัสดี
        </Text>
        <Text
          style={{
            fontFamily: Platform.select({
              android: 'Anakotmai',
              ios: 'Anakotmai',
            }),
          }}
        >
          สวัสดี
        </Text>
        <Text
          className="text-xl"
          style={{
            fontFamily: Platform.select({
              android: 'Inter_700Bold',
              ios: 'Inter-Bold',
            }),
          }}
        >
          Whereas disregard
        </Text>
        <H2>Button</H2>
        <View className="flex flex-row gap-2 flex-wrap">
          <Button>
            <Text>Button</Text>
          </Button>
          <Button variant="secondary">
            <Text>Button</Text>
          </Button>
          <Button variant="outline">
            <Text>Button</Text>
          </Button>
          <Button variant="ghost">
            <Text>Button</Text>
          </Button>
          <Button variant="link">
            <Text>Button</Text>
          </Button>
          <Button variant="destructive">
            <Text>Button</Text>
          </Button>
        </View>
      </View>
    </View>
  )
}
