/**
 * The loading overlay over a mini app's WebView, as a pure state machine.
 *
 * It covers the first load only, like the WebView's own `startInLoadingState`.
 * It starts as `loading` and, at the first load end, hides, unless the page
 * asked to hold it (`<meta name="pple-today:ready" content="manual">`,
 * reported as `pple:ready-hold` before that load end). A held overlay hides on
 * `pple:ready`, or `HOLD_TIMEOUT_MS` after load end. It also hides on any
 * error, and `HARD_CAP_MS` after it started if load end never came, so no page
 * can leave the user on a loading screen. Once hidden it stays hidden:
 * reloads, links and in-page routes never bring it back (on Android the
 * WebView reports a load start for every history change, so none is used).
 * Only a new WebView (`mount`, e.g. after a role switch) starts it over.
 */

/** How long a held overlay waits for `ready` after load end. */
export const HOLD_TIMEOUT_MS = 8_000
/** The longest the overlay stays up if the first load end never comes. */
export const HARD_CAP_MS = 20_000

export type LoadingState = {
  /** `loading`: before the first load end. `held`: loaded, waiting for the app's `ready`. `hidden`: for good. */
  phase: 'loading' | 'held' | 'hidden'
  /** A hold arrived before load end. */
  holdSeen: boolean
  /** `ready` arrived before load end. */
  readySeen: boolean
  /** The hold ended on its timeout, not on `ready`: a developer should hear of it. */
  timedOut: boolean
}

export type LoadingEvent =
  /** A WebView was (re)mounted, e.g. after a role switch: a new first load. */
  | { type: 'mount' }
  | { type: 'loadEnd' }
  | { type: 'hold' }
  | { type: 'ready' }
  | { type: 'error' }
  | { type: 'timer'; timer: 'hold' | 'cap' }

export const initialLoadingState: LoadingState = {
  phase: 'loading',
  holdSeen: false,
  readySeen: false,
  timedOut: false,
}

export function loadingReducer(state: LoadingState, event: LoadingEvent): LoadingState {
  switch (event.type) {
    case 'mount':
      return initialLoadingState
    case 'hold':
      // Only before the first load end: a late hold would blank a page already shown.
      return state.phase === 'loading' ? { ...state, holdSeen: true } : state
    case 'ready':
      if (state.phase === 'held') return { ...state, phase: 'hidden' }
      return state.phase === 'loading' ? { ...state, readySeen: true } : state
    case 'loadEnd':
      if (state.phase !== 'loading') return state
      return { ...state, phase: state.holdSeen && !state.readySeen ? 'held' : 'hidden' }
    case 'error':
      return state.phase === 'hidden' ? state : { ...state, phase: 'hidden' }
    case 'timer':
      if (event.timer === 'hold' && state.phase === 'held') {
        return { ...state, phase: 'hidden', timedOut: true }
      }
      if (event.timer === 'cap' && state.phase === 'loading') return { ...state, phase: 'hidden' }
      return state
  }
}

/** The timer a state needs running, if any. */
export function loadingTimer(state: LoadingState): { timer: 'hold' | 'cap'; ms: number } | null {
  if (state.phase === 'held') return { timer: 'hold', ms: HOLD_TIMEOUT_MS }
  if (state.phase === 'loading') return { timer: 'cap', ms: HARD_CAP_MS }
  return null
}
