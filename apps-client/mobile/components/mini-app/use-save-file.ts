import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import type WebView from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'

import { toast } from '@pple-today/ui/toast'
import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { buildReplyScript, isMainFrameOrigin, originOf } from '@app/utils/mini-app-bridge'
import { isTrustedMiniAppOrigin } from '@app/utils/mini-app-capabilities'
import {
  isInSaveFileCooldown,
  parseSaveFileBridgeRequest,
  parseSaveFileRequest,
  SAVE_FILE_TYPES,
  saveFileAckReply,
  saveFileDeniedReply,
  saveFilePresentedReply,
  type SaveFileReply,
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
 * Where files wait for the share sheet. Some Android share targets read the
 * file after the share has returned, so a file is not deleted right after the
 * sheet closes: the next share (or the next mount) clears the directory.
 */
const SHARE_DIRECTORY = 'mini-app-share'

/** Best effort: a file that cannot be deleted is left for the system to clear from the cache. */
function clearShareDirectory() {
  try {
    const directory = new Directory(Paths.cache, SHARE_DIRECTORY)
    if (directory.exists) directory.delete()
  } catch {
    // best effort
  }
}

let shareCount = 0

/**
 * Hands files a mini app offers to the share sheet, where Save Image puts an
 * image in Photos (iOS asks for access then; NSPhotoLibraryAddUsageDescription
 * in app.config.ts). Two ways in (utils/mini-app-save-file.ts):
 *
 * - The SDK's `saveFile()` (`pple:save-file-request`), on both platforms,
 *   answered over the bridge. Always answered (ack, then presented or denied),
 *   because the SDK does not fall back once the host lists `saveFile`.
 * - A tap on an `<a download>` link, caught by `script`: same-origin, `blob:`
 *   and `data:` links on iOS, only `blob:` and `data:` on Android (its WebView
 *   downloads an http(s) link itself).
 *
 * `script` goes into the WebView's `injectedJavaScriptBeforeContentLoaded` on
 * both platforms. The `saveFile` capability itself is listed by the host
 * script (utils/mini-app-capabilities.ts), on trusted pages only.
 * Only pages on the party's domains may save (`isTrustedMiniAppOrigin`).
 *
 * Only the main frame's page may save: a message from another origin (an
 * iframe) is dropped without an ack or a sheet. `mainFrameUrlRef` holds the
 * main frame's URL as the native layer last reported it; until it is known,
 * the message's own URL stands alone.
 *
 * `onMessage` answers true when the message was a save, so the session bridge
 * can skip it.
 */
export function useSaveFile(
  webViewRef: RefObject<WebView | null>,
  mainFrameUrlRef: RefObject<string | null>
) {
  const secret = useMemo(newSecret, [])
  // iOS's WKWebView opens a download instead of saving it. Android's WebView
  // downloads an http(s) link itself (with the page's cookies), so there the
  // script takes only `blob:` and `data:` links, which its downloader cannot.
  const script = useMemo(
    () => saveFileScript(secret, { platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    [secret]
  )
  const busy = useRef(false)
  // When the last sheet closed, for the cooldown after it.
  const closedAt = useRef<number | null>(null)

  useEffect(clearShareDirectory, [])

  /**
   * Resolves true once the share sheet has closed, false when it could not be
   * shown. `toastOnFailure` is for a download link, which has no reply channel
   * to tell the app; `saveFile()` gets `denied: error` and shows its own.
   */
  const share = async (request: SaveFileRequest, toastOnFailure: boolean): Promise<boolean> => {
    try {
      clearShareDirectory()
      // A folder of its own keeps the file name the user sees as `request.fileName`.
      const directory = new Directory(Paths.cache, SHARE_DIRECTORY, `${Date.now()}-${++shareCount}`)
      directory.create({ intermediates: true })
      const file = new File(directory, request.fileName)
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
      if (toastOnFailure) toast({ text1: 'บันทึกไฟล์ไม่สำเร็จ', text2: 'ลองอีกครั้ง' })
      return false
    }
  }

  /**
   * One share sheet at a time: `null` when one is already open, else whether
   * this one could be shown (once it has closed).
   */
  const shareOne = (request: SaveFileRequest, toastOnFailure: boolean): Promise<boolean> | null => {
    if (busy.current) return null
    busy.current = true
    return share(request, toastOnFailure).finally(() => {
      busy.current = false
      closedAt.current = Date.now()
    })
  }

  const onMessage = (event: WebViewMessageEvent): boolean => {
    const { data, url } = event.nativeEvent

    const bridgeRequest = parseSaveFileBridgeRequest(data)
    if (bridgeRequest) {
      // Not the main frame's page (an iframe): not ours to answer, and no sheet.
      if (!isMainFrameOrigin(url, mainFrameUrlRef.current)) return true
      // As for a session: the origin comes from the native layer, and a page
      // without a web origin gets no reply (the host script lists no `saveFile` for
      // it, so its SDK never asks; one that asks anyway ends as failed after its ack wait).
      const origin = originOf(url)
      if (!origin) return true
      const reply = (message: SaveFileReply) =>
        webViewRef.current?.injectJavaScript(buildReplyScript(origin, message))
      const { requestId } = bridgeRequest
      reply(saveFileAckReply(requestId))
      if (!url.startsWith('https://')) reply(saveFileDeniedReply(requestId, 'insecure-origin'))
      else if (!isTrustedMiniAppOrigin(url)) reply(saveFileDeniedReply(requestId, 'not-allowed'))
      else if (!bridgeRequest.ok) reply(saveFileDeniedReply(requestId, bridgeRequest.reason))
      else if (isInSaveFileCooldown(closedAt.current, Date.now()))
        reply(saveFileDeniedReply(requestId, 'busy'))
      else {
        const shown = shareOne(bridgeRequest.file, false)
        if (!shown) reply(saveFileDeniedReply(requestId, 'busy'))
        else
          void shown.then((ok) =>
            reply(ok ? saveFilePresentedReply(requestId) : saveFileDeniedReply(requestId, 'error'))
          )
      }
      return true
    }

    const request = parseSaveFileRequest(data, secret)
    if (!request) return false
    // A page has no say over where it came from: only the main frame's page,
    // on an allowed domain, saves. The injected script checks too.
    if (!isMainFrameOrigin(url, mainFrameUrlRef.current)) return true
    if (isTrustedMiniAppOrigin(url)) void shareOne(request, true)
    return true
  }

  return { script, onMessage }
}
