import { type RefObject, useRef } from 'react'
import type { WebViewMessageEvent } from 'react-native-webview'

import * as Haptics from 'expo-haptics'

import { isMainFrameOrigin } from '@app/utils/mini-app-bridge'
import {
  allowHaptic,
  type HapticStyle,
  isTrustedMiniAppOrigin,
  parseHapticMessage,
} from '@app/utils/mini-app-capabilities'

function play(style: HapticStyle): Promise<void> {
  switch (style) {
    case 'selection':
      return Haptics.selectionAsync()
    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    case 'heavy':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    case 'soft':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    case 'rigid':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    case 'warning':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }
}

/**
 * Plays a haptic a mini app asks for (`pple:haptic`, utils/mini-app-capabilities.ts).
 * Fire and forget: no ack, no reply. Only the main frame's page, on a trusted
 * https domain, may ask; an unknown style is ignored, and more than about 10 a
 * second are dropped.
 *
 * `onMessage` answers true when the message was a haptic, so the others skip it.
 */
export function useHaptics(mainFrameUrlRef: RefObject<string | null>) {
  const history = useRef<number[]>([])

  const onMessage = (event: WebViewMessageEvent): boolean => {
    const { data, url } = event.nativeEvent
    const request = parseHapticMessage(data)
    if (!request) return false
    if (!request.style) return true
    if (!isMainFrameOrigin(url, mainFrameUrlRef.current) || !isTrustedMiniAppOrigin(url)) {
      return true
    }
    const limited = allowHaptic(history.current, Date.now())
    history.current = limited.history
    if (limited.allowed) play(request.style).catch(() => {})
    return true
  }

  return { onMessage }
}
