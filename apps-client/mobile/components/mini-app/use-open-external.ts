import { type RefObject, useRef } from 'react'
import { Linking } from 'react-native'
import type WebView from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'

import { buildReplyScript, isMainFrameOrigin, originOf } from '@app/utils/mini-app-bridge'
import { isTrustedMiniAppOrigin } from '@app/utils/mini-app-capabilities'
import {
  isInOpenExternalCooldown,
  openExternalAckReply,
  openExternalDeniedReply,
  openExternalOpenedReply,
  type OpenExternalReply,
  parseOpenExternalRequest,
} from '@app/utils/mini-app-open-external'

/**
 * Opens a URL a mini app hands over (`openExternal()` in the SDK,
 * `pple:open-external-request`) in the system browser, or in the app that
 * claims it (a meeting app for its links, the phone app for `tel:`), so a
 * third-party service gets its own cookies, logins and camera permissions, and
 * the user switches back to PPLE Today as to any other app.
 *
 * Only the main frame's page may ask: a request from another origin (an
 * iframe) is dropped without an ack. Past that it is always answered (ack, then
 * `opened` or `denied`), because the SDK does not fall back once the host lists
 * `openExternal`. Only https pages on the party's domains may open a URL
 * (`isTrustedMiniAppOrigin`), only https, mailto and tel URLs are opened, and at
 * most one a second.
 *
 * `onMessage` answers true when the message was an open request, so the
 * session bridge can skip it.
 */
export function useOpenExternal(
  webViewRef: RefObject<WebView | null>,
  mainFrameUrlRef: RefObject<string | null>
) {
  const busy = useRef(false)
  // When the last URL was opened, for the cooldown after it.
  const openedAt = useRef<number | null>(null)

  const onMessage = (event: WebViewMessageEvent): boolean => {
    const { data, url } = event.nativeEvent
    const request = parseOpenExternalRequest(data)
    if (!request) return false
    // Not the main frame's page (an iframe): not ours to answer.
    if (!isMainFrameOrigin(url, mainFrameUrlRef.current)) return true
    // As for a session: the origin comes from the native layer, and a page
    // without a web origin gets no reply.
    const origin = originOf(url)
    if (!origin) return true

    const reply = (message: OpenExternalReply) =>
      webViewRef.current?.injectJavaScript(buildReplyScript(origin, message))
    const { requestId } = request
    reply(openExternalAckReply(requestId))

    if (!isTrustedMiniAppOrigin(url)) reply(openExternalDeniedReply(requestId, 'not-allowed'))
    else if (!request.ok) reply(openExternalDeniedReply(requestId, request.reason))
    else if (busy.current || isInOpenExternalCooldown(openedAt.current, Date.now()))
      reply(openExternalDeniedReply(requestId, 'busy'))
    else void open(request.url, requestId, reply)
    return true
  }

  const open = async (
    url: string,
    requestId: string,
    reply: (message: OpenExternalReply) => void
  ) => {
    busy.current = true
    try {
      await Linking.openURL(url)
      openedAt.current = Date.now()
      reply(openExternalOpenedReply(requestId))
    } catch (error) {
      // Nothing on the device handles it (`tel:` on an iPad, no mail app).
      console.warn('Mini app could not open a URL', { error })
      reply(openExternalDeniedReply(requestId, 'unsupported'))
    } finally {
      busy.current = false
    }
  }

  return { onMessage }
}
