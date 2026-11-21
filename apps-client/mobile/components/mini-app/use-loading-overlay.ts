import { type RefObject, useEffect, useReducer, useRef } from 'react'
import type { WebViewMessageEvent } from 'react-native-webview'

import { isMainFrameOrigin } from '@app/utils/mini-app-bridge'
import { parseReadyMessage } from '@app/utils/mini-app-capabilities'
import { initialLoadingState, loadingReducer, loadingTimer } from '@app/utils/mini-app-loading'

/**
 * The loading overlay over a mini app's WebView, for its first load only
 * (utils/mini-app-loading.ts for the rules). The WebView stays mounted
 * underneath, so it loads while the overlay shows. `enabled` is whether a
 * WebView is on screen: the 20 s cap counts from then, not while the app is
 * still being resolved. `handlers` go on the WebView; `onMessage` takes the page's
 * `pple:ready-hold` and `pple:ready`, from the main frame's page only, and
 * answers true when the message was one.
 */
export function useLoadingOverlay(
  mainFrameUrlRef: RefObject<string | null>,
  enabled: boolean,
  /** The WebView's source URL: a new one (or a WebView shown again) is a new first load. */
  sourceUrl: string | null
) {
  const [state, dispatch] = useReducer(loadingReducer, initialLoadingState)
  const warned = useRef(false)

  // A role switch unmounts the WebView and mounts a new one, with a new URL:
  // that one gets its own loading screen.
  useEffect(() => {
    if (enabled) dispatch({ type: 'mount' })
  }, [enabled, sourceUrl])

  const timer = enabled ? loadingTimer(state) : null
  const timerName = timer?.timer
  const timerMs = timer?.ms
  useEffect(() => {
    if (!timerName || timerMs === undefined) return
    const id = setTimeout(() => dispatch({ type: 'timer', timer: timerName }), timerMs)
    return () => clearTimeout(id)
  }, [timerName, timerMs])

  useEffect(() => {
    if (!state.timedOut || warned.current) return
    warned.current = true
    console.warn(
      '[PPLE Mini App] The page held the loading screen (<meta name="pple-today:ready" content="manual">) but never called ready(); PPLE Today showed it after 8 s.'
    )
  }, [state.timedOut])

  const onMessage = (event: WebViewMessageEvent): boolean => {
    const kind = parseReadyMessage(event.nativeEvent.data)
    if (!kind) return false
    if (isMainFrameOrigin(event.nativeEvent.url, mainFrameUrlRef.current)) {
      dispatch({ type: kind })
    }
    return true
  }

  return {
    visible: state.phase !== 'hidden',
    onMessage,
    handlers: {
      onLoadEnd: () => dispatch({ type: 'loadEnd' }),
      onError: () => dispatch({ type: 'error' }),
      onHttpError: () => dispatch({ type: 'error' }),
      onContentProcessDidTerminate: () => dispatch({ type: 'error' }),
      onRenderProcessGone: () => dispatch({ type: 'error' }),
    },
  }
}
