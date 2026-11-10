// SPIKE (Live Activity S4–S6). Hidden screen, reachable only by the link
// `pple-today://debug-live-activity`. Shows the push-to-start token and the
// native log, and shares them so they can be pasted back to the spike runner.
import { useCallback, useEffect, useState } from 'react'
import { Button, Platform, ScrollView, Share, Text, View } from 'react-native'

import { requireOptionalNativeModule } from 'expo'

type LiveActivityLog = { startToken: string; log: string[] }
type NotificationActionsModule = {
  getLiveActivityLog(): LiveActivityLog
  startLocalTestActivity(): string
  clearLiveActivityLog(): void
}

const native =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<NotificationActionsModule>('NotificationActions')
    : null

export default function DebugLiveActivity() {
  const [data, setData] = useState<LiveActivityLog>({ startToken: '', log: [] })

  const refresh = useCallback(() => {
    if (native) setData(native.getLiveActivityLog())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const text = [`startToken: ${data.startToken || '(none)'}`, '', ...data.log].join('\n')

  return (
    <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Live Activity spike</Text>
      {!native && <Text>Native module unavailable (iOS only).</Text>}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button title="Refresh" onPress={refresh} />
        <Button title="Share" onPress={() => Share.share({ message: text })} />
        <Button
          title="Start local test"
          onPress={() => {
            native?.startLocalTestActivity()
            refresh()
          }}
        />
        <Button
          title="Clear log"
          onPress={() => {
            native?.clearLiveActivityLog()
            refresh()
          }}
        />
      </View>
      <ScrollView>
        <Text selectable style={{ fontFamily: 'Menlo', fontSize: 11 }}>
          {text}
        </Text>
      </ScrollView>
    </View>
  )
}
