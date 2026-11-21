import { type RefObject, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import type WebView from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'

import { toast } from '@pple-today/ui/toast'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { buildReplyScript, originOf } from '@app/utils/mini-app-bridge'
import {
  parseSaveFileBridgeRequest,
  parseSaveFileRequest,
  SAVE_FILE_TYPES,
  saveFileAckReply,
  saveFileDeniedReply,
  type SaveFileReply,
  type SaveFileRequest,
  saveFileScript,
  saveFileSharedReply,
} from '@app/utils/mini-app-save-file'

/** A secret for one WebView's injected script: page scripts cannot read it, so cannot forge a save. */
function newSecret(): string {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hands files a mini app offers to the share sheet, where Save Image puts an
 * image in Photos (iOS asks for access then; NSPhotoLibraryAddUsageDescription
 * in app.config.ts). Two ways in (utils/mini-app-save-file.ts):
 *
 * - The SDK's `saveFile()` (`pple:save-file-request`), on both platforms,
 *   answered over the bridge.
 * - A tap on an `<a download>` link, on iOS, caught by `script`, which goes
 *   into the WebView's `injectedJavaScriptBeforeContentLoaded`.
 *
 * `onMessage` answers true when the message was a save, so the session bridge
 * can skip it.
 */
export function useSaveFile(webViewRef: RefObject<WebView | null>) {
  const secret = useMemo(newSecret, [])
  // iOS only: WKWebView opens a download instead of saving it. Android's WebView
  // downloads it itself (with the page's cookies), so it is left alone there.
  const script = useMemo(() => (Platform.OS === 'ios' ? saveFileScript(secret) : ''), [secret])
  const busy = useRef(false)

  /** Resolves true once the share sheet has closed, false when it could not be shown. */
  const share = async (request: SaveFileRequest): Promise<boolean> => {
    const file = new File(Paths.cache, request.fileName)
    try {
      if (file.exists) file.delete()
      file.create()
      file.write(request.dataBase64, { encoding: 'base64' })
      // The share sheet, for every type: Save Image (to Photos), Save to Files,
      // LINE, AirDrop. iOS asks for Photos access the first time Save Image is used.
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable')
      await Sharing.shareAsync(file.uri, {
        mimeType: request.mimeType,
        UTI: SAVE_FILE_TYPES[request.mimeType]?.uti,
        dialogTitle: request.fileName,
      })
      return true
    } catch (error) {
      console.warn('Mini app file save failed', { kind: request.kind, error })
      toast({ text1: 'บันทึกไฟล์ไม่สำเร็จ', text2: 'ลองอีกครั้ง' })
      return false
    } finally {
      // The share sheet is closed, so the file has been handed over: the cache copy is not needed.
      try {
        if (file.exists) file.delete()
      } catch {
        // best effort
      }
    }
  }

  /**
   * One share sheet at a time: `null` when one is already open, else whether
   * this one could be shown (once it has closed).
   */
  const shareOne = (request: SaveFileRequest): Promise<boolean> | null => {
    if (busy.current) return null
    busy.current = true
    return share(request).finally(() => {
      busy.current = false
    })
  }

  const onMessage = (event: WebViewMessageEvent): boolean => {
    const { data, url } = event.nativeEvent

    const bridgeRequest = parseSaveFileBridgeRequest(data)
    if (bridgeRequest) {
      // As for a session: the origin comes from the native layer, and a page
      // without a web origin gets no ack (its SDK falls back).
      const origin = originOf(url)
      if (!origin) return true
      const reply = (message: SaveFileReply) =>
        webViewRef.current?.injectJavaScript(buildReplyScript(origin, message))
      const { requestId } = bridgeRequest
      reply(saveFileAckReply(requestId))
      if (!url.startsWith('https://')) reply(saveFileDeniedReply(requestId, 'error'))
      else if (!bridgeRequest.ok) reply(saveFileDeniedReply(requestId, bridgeRequest.reason))
      else {
        const shown = shareOne(bridgeRequest.file)
        if (!shown) reply(saveFileDeniedReply(requestId, 'busy'))
        else
          void shown.then((ok) =>
            reply(ok ? saveFileSharedReply(requestId) : saveFileDeniedReply(requestId, 'error'))
          )
      }
      return true
    }

    const request = parseSaveFileRequest(data, secret)
    if (!request) return false
    // A page has no say over where it came from: only https pages save.
    if (url?.startsWith('https://')) void shareOne(request)
    return true
  }

  return { script, onMessage }
}
