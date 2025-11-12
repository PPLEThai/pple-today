import * as React from 'react'
import { TextProps } from 'react-native'

import * as Linking from 'expo-linking'

// https://stackoverflow.com/a/6041965
const re = /(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])/g

export function createTextWithLinks(
  original: string,
  TextComponent: React.ComponentType<TextProps>
): React.ReactNode[] {
  const matches = original.matchAll(re)
  const urls = Array.from(matches, (m) => ({ match: m[0], index: m.index }))
  let index = 0
  const texts: React.ReactNode[] = []
  for (const url of urls) {
    texts.push(original.slice(index, url.index))
    texts.push(
      <TextComponent
        onPress={() => Linking.openURL(url.match)}
        className="text-blue-500"
        key={url.index}
      >
        {url.match}
      </TextComponent>
    )
    index = url.index + url.match.length
  }
  texts.push(original.slice(index, original.length))
  return texts
}
