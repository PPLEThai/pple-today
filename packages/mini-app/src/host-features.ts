import { hasCapability, postToHost } from './bridge'

// See BRIDGE.md ("Haptics", "Ready signal").

/** The feedback styles PPLE Today can play. */
export type HapticStyle =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'success'
  | 'warning'
  | 'error'

/**
 * Plays a haptic tap on the phone, inside PPLE Today only. Fire and forget:
 * it returns nothing, never throws, and does nothing in a browser, on an older
 * PPLE Today, or on a page the host does not allow (see `hasCapability('haptics')`).
 * It needs no `init()`. The host plays at most about 10 a second and drops the rest.
 */
export function haptic(style: HapticStyle): void {
  try {
    if (!hasCapability('haptics')) return
    postToHost({ type: 'pple:haptic', style })
  } catch {
    // Never throws.
  }
}

let readySent = false

/**
 * Tells PPLE Today the first screen has rendered, so it can take down its
 * loading screen. It only matters for a page that holds the loading screen
 * with `<meta name="pple-today:ready" content="manual">`; without the tag it
 * is harmless, and without the call the host waits at most 8 s after the page
 * loads. Sent once per page load; later calls do nothing, as does a call
 * outside PPLE Today or on a host without the `ready` capability.
 */
export function ready(): void {
  try {
    if (readySent || !hasCapability('ready')) return
    readySent = true
    postToHost({ type: 'pple:ready' })
  } catch {
    // Never throws.
  }
}
