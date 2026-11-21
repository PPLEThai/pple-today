/**
 * Saving a file a mini app offers for download (`<a download>`): a QR to pay
 * with, a receipt. The WebView itself cannot: iOS's WKWebView opens the file
 * instead of saving it, and a native download would not carry the page's
 * cookies (a Checkout Page's QR is the signed-in Payer's only).
 *
 * So the host injects a script (`saveFileScript`) that catches the tap on a
 * same-origin `<a download>` link, fetches the file as the page (with its
 * cookies), and posts it to the host as `pple:save-file`; the host saves an
 * image to Photos and offers anything else through the share sheet. Mini apps
 * change nothing: an ordinary download link is enough (packages/mini-app/BRIDGE.md).
 *
 * The message carries a secret only the injected script knows, held in its
 * closure, so a page cannot forge one by posting to `ReactNativeWebView`
 * itself; and the script acts on a real tap only (`isTrusted`).
 */

export const SAVE_FILE_REQUEST_TYPE = 'pple:save-file'

/** What the host saves: images to Photos, PDFs through the share sheet. Nothing else. */
export const SAVE_FILE_TYPES: Record<string, { kind: 'image' | 'document'; extension: string }> = {
  'image/png': { kind: 'image', extension: 'png' },
  'image/jpeg': { kind: 'image', extension: 'jpg' },
  'image/gif': { kind: 'image', extension: 'gif' },
  'image/webp': { kind: 'image', extension: 'webp' },
  'image/heic': { kind: 'image', extension: 'heic' },
  'application/pdf': { kind: 'document', extension: 'pdf' },
}

/** The largest file the script sends (bytes). Bigger ones open in the WebView as before. */
export const SAVE_FILE_MAX_BYTES = 10 * 1024 * 1024

export interface SaveFileRequest {
  type: typeof SAVE_FILE_REQUEST_TYPE
  version: 1
  fileName: string
  mimeType: string
  kind: 'image' | 'document'
  dataBase64: string
}

/**
 * The script the host injects before the page's own: it waits for a tap on a
 * same-origin (or `blob:`/`data:`) `<a download>` link. Anything it cannot
 * handle (another origin, too big, a failed fetch, a type the host does not
 * save) is left to the WebView, which opens the file as it always did.
 */
export function saveFileScript(secret: string): string {
  const types = JSON.stringify(Object.keys(SAVE_FILE_TYPES))
  return `(function(){
if (window.__ppleSaveFile) return; window.__ppleSaveFile = true;
var SECRET = ${JSON.stringify(secret)}, TYPES = ${types}, MAX = ${SAVE_FILE_MAX_BYTES};
var rn = window.ReactNativeWebView, post = rn && rn.postMessage ? rn.postMessage.bind(rn) : null;
var get = window.fetch ? window.fetch.bind(window) : null, Reader = window.FileReader;
document.addEventListener('click', function (e) {
  if (!e.isTrusted || !post || !get || !e.target || !e.target.closest) return;
  var a = e.target.closest('a[download]');
  if (!a || !a.href) return;
  var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
  if (u.protocol !== 'blob:' && u.protocol !== 'data:' && u.origin !== location.origin) return;
  e.preventDefault();
  var open = function () { location.href = u.href; };
  get(u.href, { credentials: 'include' }).then(function (r) {
    if (!r.ok) throw new Error('status');
    return r.blob();
  }).then(function (b) {
    var type = (b.type || '').split(';')[0].trim().toLowerCase();
    if (b.size > MAX || TYPES.indexOf(type) < 0) throw new Error('type');
    var reader = new Reader();
    reader.onload = function () {
      var d = String(reader.result), i = d.indexOf(',');
      post(JSON.stringify({ type: 'pple:save-file', version: 1, secret: SECRET,
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
      .replace(/\.[A-Za-z0-9]{1,5}$/, '')
      .trim()
      .slice(0, 80) || 'file'
  return `${base}.${extension}`
}

/**
 * The save request inside a WebView message, or `null` for anything else:
 * a message without the injected script's `secret`, a type the host does not
 * save, data that is not base64, or a file over the size limit.
 */
export function parseSaveFileRequest(data: unknown, secret: string): SaveFileRequest | null {
  if (typeof data !== 'string' || !secret) return null
  let message: unknown
  try {
    message = JSON.parse(data)
  } catch {
    return null
  }
  if (typeof message !== 'object' || message === null) return null
  const m = message as Record<string, unknown>
  if (m.type !== SAVE_FILE_REQUEST_TYPE || m.version !== 1 || m.secret !== secret) return null
  if (
    typeof m.mimeType !== 'string' ||
    typeof m.fileName !== 'string' ||
    typeof m.dataBase64 !== 'string'
  )
    return null
  const type = SAVE_FILE_TYPES[m.mimeType]
  if (!type) return null
  if (m.dataBase64.length === 0 || m.dataBase64.length > Math.ceil(SAVE_FILE_MAX_BYTES / 3) * 4)
    return null
  if (!BASE64.test(m.dataBase64)) return null
  return {
    type: SAVE_FILE_REQUEST_TYPE,
    version: 1,
    fileName: safeFileName(m.fileName, m.mimeType),
    mimeType: m.mimeType,
    kind: type.kind,
    dataBase64: m.dataBase64,
  }
}
