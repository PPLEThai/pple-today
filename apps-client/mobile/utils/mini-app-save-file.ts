import { trustedPageSnippet } from './mini-app-capabilities'

/**
 * Saving a file a mini app offers, two ways (packages/mini-app/BRIDGE.md):
 *
 * - `saveFile()` in the SDK sends `pple:save-file-request` over the bridge, on
 *   both platforms, and gets an answer (`parseSaveFileBridgeRequest`).
 * - An ordinary download link (`<a download>`), below: on iOS a same-origin, `blob:` or `data:`
 *   link, on Android only `blob:` and `data:` (the WebView downloads an http(s) link itself).
 *
 * Only pages on the party's own domains save (`isTrustedMiniAppOrigin`).
 *
 * Download links: a QR to pay with, a receipt. The WebView itself cannot: iOS's WKWebView opens the file
 * instead of saving it, and a native download would not carry the page's
 * cookies (a Checkout Page's QR is the signed-in Payer's only).
 *
 * So the host injects a script (`saveFileScript`) that catches the tap on a
 * same-origin `<a download>` link, fetches the file as the page (with its
 * cookies), and posts it to the host as `pple:download-link`; the host opens the
 * share sheet with it (Save Image puts an image in Photos). Mini apps
 * change nothing: an ordinary download link is enough (packages/mini-app/BRIDGE.md).
 *
 * The message carries a secret only the injected script knows, held in its
 * closure, so a page cannot forge one by posting to `ReactNativeWebView`
 * itself; and the script acts on a real tap only (`isTrusted`).
 */

export const SAVE_FILE_REQUEST_TYPE = 'pple:download-link'
export const SAVE_FILE_BRIDGE_REQUEST_TYPE = 'pple:save-file-request'
export const SAVE_FILE_ACK_TYPE = 'pple:save-file-ack'
export const SAVE_FILE_RESPONSE_TYPE = 'pple:save-file-response'

/** A share sheet that has just closed holds the next request off for this long (ms). */
export const SAVE_FILE_COOLDOWN_MS = 1_000

/** Whether a sheet closed at `closedAt` (a `Date.now()`, or `null`) still holds requests off at `now`. */
export function isInSaveFileCooldown(closedAt: number | null, now: number): boolean {
  return closedAt !== null && now - closedAt < SAVE_FILE_COOLDOWN_MS
}

/** What the host hands to the share sheet (Save Image for an image), with its iOS type. Nothing else. */
export const SAVE_FILE_TYPES: Record<
  string,
  { kind: 'image' | 'document'; extension: string; uti: string }
> = {
  'image/png': { kind: 'image', extension: 'png', uti: 'public.png' },
  'image/jpeg': { kind: 'image', extension: 'jpg', uti: 'public.jpeg' },
  'image/gif': { kind: 'image', extension: 'gif', uti: 'com.compuserve.gif' },
  'image/webp': { kind: 'image', extension: 'webp', uti: 'org.webmproject.webp' },
  'image/heic': { kind: 'image', extension: 'heic', uti: 'public.heic' },
  'application/pdf': { kind: 'document', extension: 'pdf', uti: 'com.adobe.pdf' },
}

/** Common non-standard names for the types above. The host and the injected script read them as the standard one. */
export const SAVE_FILE_TYPE_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
}

/** The standard name for a type: lower case, without parameters, aliases resolved. */
export function canonicalMimeType(type: string): string {
  const base = type.split(';')[0].trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(SAVE_FILE_TYPE_ALIASES, base)
    ? SAVE_FILE_TYPE_ALIASES[base]
    : base
}

/** The largest file the script sends (bytes). Bigger ones open in the WebView as before. */
export const SAVE_FILE_MAX_BYTES = 10 * 1024 * 1024

/** A file to hand to the share sheet, checked. */
export interface SaveFileRequest {
  fileName: string
  mimeType: string
  kind: 'image' | 'document'
  dataBase64: string
}

export type SaveFileDeniedReason =
  | 'unsupported-type'
  | 'too-large'
  | 'busy'
  | 'insecure-origin'
  | 'not-allowed'
  | 'error'

export type SaveFileAck = { type: typeof SAVE_FILE_ACK_TYPE; requestId: string }

export type SaveFileResponse =
  | { type: typeof SAVE_FILE_RESPONSE_TYPE; requestId: string; status: 'presented' }
  | {
      type: typeof SAVE_FILE_RESPONSE_TYPE
      requestId: string
      status: 'denied'
      reason: SaveFileDeniedReason
    }

export type SaveFileReply = SaveFileAck | SaveFileResponse

export const saveFileAckReply = (requestId: string): SaveFileAck => ({
  type: SAVE_FILE_ACK_TYPE,
  requestId,
})

export const saveFilePresentedReply = (requestId: string): SaveFileResponse => ({
  type: SAVE_FILE_RESPONSE_TYPE,
  requestId,
  status: 'presented',
})

export const saveFileDeniedReply = (
  requestId: string,
  reason: SaveFileDeniedReason
): SaveFileResponse => ({ type: SAVE_FILE_RESPONSE_TYPE, requestId, status: 'denied', reason })

/**
 * The script the host injects before the page's own: it waits for a tap on a
 * `<a download>` link that is same-origin (iOS only) or `blob:`/`data:`. On
 * Android an http(s) link is left to the WebView's own downloader. Anything it
 * cannot handle (another origin, too big, a failed fetch, a type the host does
 * not save, a page off the allowed domains) is left to the WebView, which
 * opens the file as it always did.
 */
export function saveFileScript(
  secret: string,
  { platform }: { platform: 'ios' | 'android' }
): string {
  const types = JSON.stringify(Object.keys(SAVE_FILE_TYPES))
  const aliases = JSON.stringify(SAVE_FILE_TYPE_ALIASES)
  return `(function(){
if (window.__ppleSaveFile) return; window.__ppleSaveFile = true;
var SECRET = ${JSON.stringify(secret)}, TYPES = ${types}, ALIASES = ${aliases}, MAX = ${SAVE_FILE_MAX_BYTES}, SAME_ORIGIN = ${platform === 'ios'};
var rn = window.ReactNativeWebView, post = rn && rn.postMessage ? rn.postMessage.bind(rn) : null;
var get = window.fetch ? window.fetch.bind(window) : null, Reader = window.FileReader;
${trustedPageSnippet()}
document.addEventListener('click', function (e) {
  if (!trusted() || !e.isTrusted || !post || !get || !e.target || !e.target.closest) return;
  var a = e.target.closest('a[download]');
  if (!a || !a.href) return;
  var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
  if (u.protocol !== 'blob:' && u.protocol !== 'data:' && !(SAME_ORIGIN && u.origin === location.origin)) return;
  e.preventDefault();
  var open = function () { location.href = u.href; };
  get(u.href, { credentials: 'include' }).then(function (r) {
    if (!r.ok) throw new Error('status');
    return r.blob();
  }).then(function (b) {
    var type = (b.type || '').split(';')[0].trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(ALIASES, type)) type = ALIASES[type];
    if (b.size > MAX || TYPES.indexOf(type) < 0) throw new Error('type');
    var reader = new Reader();
    reader.onload = function () {
      var d = String(reader.result), i = d.indexOf(',');
      post(JSON.stringify({ type: 'pple:download-link', version: 1, secret: SECRET,
        fileName: a.getAttribute('download') || u.pathname.split('/').pop() || '',
        mimeType: type, dataBase64: d.slice(i + 1) }));
    };
    reader.onerror = open;
    reader.readAsDataURL(b);
  }).catch(open);
}, true);
})();true;`
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

/** A trailing extension of one of the saved types: the only kind `safeFileName` replaces. */
const KNOWN_EXTENSION = /\.(png|jpe?g|gif|webp|heic|heif|pdf)$/i

/** A file name safe to write in the cache: no path, no control characters, the type's extension. */
export function safeFileName(name: string, mimeType: string): string {
  const extension = SAVE_FILE_TYPES[mimeType]?.extension ?? 'bin'
  const base =
    name
      .split(/[\\/]/)
      .pop()!
      // Control characters are exactly what this strips.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
      .replace(KNOWN_EXTENSION, '')
      .trim()
      .slice(0, 80) || 'file'
  return `${base}.${extension}`
}

function parseJsonObject(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'string') return null
  try {
    const message: unknown = JSON.parse(data)
    return typeof message === 'object' && message !== null
      ? (message as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** The file in a message, checked: a type the host saves, base64 data within the size limit. */
function checkFile(
  m: Record<string, unknown>
): { ok: true; file: SaveFileRequest } | { ok: false; reason: SaveFileDeniedReason } {
  if (
    typeof m.mimeType !== 'string' ||
    typeof m.fileName !== 'string' ||
    typeof m.dataBase64 !== 'string'
  )
    return { ok: false, reason: 'error' }
  const mimeType = canonicalMimeType(m.mimeType)
  const type = SAVE_FILE_TYPES[mimeType]
  if (!type) return { ok: false, reason: 'unsupported-type' }
  if (m.dataBase64.length > Math.ceil(SAVE_FILE_MAX_BYTES / 3) * 4)
    return { ok: false, reason: 'too-large' }
  if (m.dataBase64.length === 0 || !BASE64.test(m.dataBase64)) return { ok: false, reason: 'error' }
  return {
    ok: true,
    file: {
      fileName: safeFileName(m.fileName, mimeType),
      mimeType,
      kind: type.kind,
      dataBase64: m.dataBase64,
    },
  }
}

/**
 * The save the injected download-link script sent, or `null` for anything
 * else: a message without its `secret`, a type the host does not save, data
 * that is not base64, or a file over the size limit.
 */
export function parseSaveFileRequest(data: unknown, secret: string): SaveFileRequest | null {
  if (!secret) return null
  const m = parseJsonObject(data)
  if (!m || m.type !== SAVE_FILE_REQUEST_TYPE || m.version !== 1 || m.secret !== secret) return null
  const checked = checkFile(m)
  return checked.ok ? checked.file : null
}

/**
 * An SDK `saveFile()` request, or `null` when the message is not one (or has
 * no id to answer). A file the host will not take comes back with the reason
 * to deny it.
 *
 * It carries no secret: the page asks, and the user decides in the share
 * sheet, so a page can do no more with it than offer a file.
 */
export function parseSaveFileBridgeRequest(
  data: unknown
):
  | { requestId: string; ok: true; file: SaveFileRequest }
  | { requestId: string; ok: false; reason: SaveFileDeniedReason }
  | null {
  const m = parseJsonObject(data)
  if (!m || m.type !== SAVE_FILE_BRIDGE_REQUEST_TYPE || m.version !== 1) return null
  const { requestId } = m
  if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 256) return null
  return { requestId, ...checkFile(m) }
}
