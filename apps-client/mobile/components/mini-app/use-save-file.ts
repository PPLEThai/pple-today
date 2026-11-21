import { useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import type { WebViewMessageEvent } from 'react-native-webview'

import { toast } from '@pple-today/ui/toast'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import {
  parseSaveFileRequest,
  SAVE_FILE_TYPES,
  type SaveFileRequest,
  saveFileScript,
} from '@app/utils/mini-app-save-file'

/** A secret for one WebView's injected script: page scripts cannot read it, so cannot forge a save. */
function newSecret(): string {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hands files a mini app offers with `<a download>` on iOS (utils/mini-app-save-file.ts)
 * to the share sheet, where Save Image puts an image in Photos (iOS asks for access
 * then; NSPhotoLibraryAddUsageDescription in app.config.ts). `script` goes into the
 * WebView's `injectedJavaScriptBeforeContentLoaded`; `onMessage` answers true
 * when the message was a save, so the session bridge can skip it.
 */
export function useSaveFile() {
  const secret = useMemo(newSecret, [])
  // iOS only: WKWebView opens a download instead of saving it. Android's WebView
  // downloads it itself (with the page's cookies), so it is left alone there.
  const script = useMemo(() => (Platform.OS === 'ios' ? saveFileScript(secret) : ''), [secret])
  const busy = useRef(false)

  const save = async (request: SaveFileRequest) => {
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
    } catch (error) {
      console.warn('Mini app file save failed', { kind: request.kind, error })
      toast({ text1: 'บันทึกไฟล์ไม่สำเร็จ', text2: 'ลองอีกครั้ง' })
    } finally {
      // The share sheet is closed, so the file has been handed over: the cache copy is not needed.
      try {
        if (file.exists) file.delete()
      } catch {
        // best effort
      }
    }
  }

  const onMessage = (event: WebViewMessageEvent): boolean => {
    const request = parseSaveFileRequest(event.nativeEvent.data, secret)
    if (!request) return false
    // A page has no say over where it came from: only https pages save.
    if (!event.nativeEvent.url?.startsWith('https://')) return true
    if (busy.current) return true
    busy.current = true
    void save(request).finally(() => {
      busy.current = false
    })
    return true
  }

  return { script, onMessage }
}
