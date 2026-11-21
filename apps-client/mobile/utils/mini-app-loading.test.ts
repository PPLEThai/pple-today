import { describe, expect, it } from 'vitest'

import {
  HARD_CAP_MS,
  HOLD_TIMEOUT_MS,
  initialLoadingState,
  type LoadingEvent,
  loadingReducer,
  loadingTimer,
} from './mini-app-loading'

const run = (...events: LoadingEvent[]) => events.reduce(loadingReducer, initialLoadingState)

describe('loadingReducer', () => {
  it('starts loading and hides at the first load end without a hold', () => {
    expect(initialLoadingState.phase).toBe('loading')
    expect(run({ type: 'loadEnd' }).phase).toBe('hidden')
  })

  it('starts over when a new WebView mounts (a role switch)', () => {
    const hidden = run({ type: 'loadEnd' })
    expect(hidden.phase).toBe('hidden')
    expect(loadingReducer(hidden, { type: 'mount' })).toEqual(initialLoadingState)
  })

  it('keeps a held overlay up past load end until ready', () => {
    const held = run({ type: 'hold' }, { type: 'loadEnd' })
    expect(held.phase).toBe('held')
    expect(loadingReducer(held, { type: 'ready' }).phase).toBe('hidden')
  })

  it('hides a held overlay on the timeout, and says so', () => {
    const held = run({ type: 'hold' }, { type: 'loadEnd' })
    expect(loadingReducer(held, { type: 'timer', timer: 'hold' })).toMatchObject({
      phase: 'hidden',
      timedOut: true,
    })
  })

  it('hides at load end when ready came before it', () => {
    expect(run({ type: 'hold' }, { type: 'ready' }, { type: 'loadEnd' }).phase).toBe('hidden')
  })

  it('ignores a hold that arrives after the first load end', () => {
    const state = run({ type: 'loadEnd' }, { type: 'hold' })
    expect(state.phase).toBe('hidden')
    expect(state.holdSeen).toBe(false)
  })

  it('stays hidden when a load end arrives after it is hidden', () => {
    const hidden = run({ type: 'loadEnd' })
    expect(loadingReducer(hidden, { type: 'loadEnd' })).toBe(hidden)
    const afterReady = run({ type: 'hold' }, { type: 'loadEnd' }, { type: 'ready' })
    expect(loadingReducer(afterReady, { type: 'loadEnd' })).toBe(afterReady)
    expect(loadingReducer(afterReady, { type: 'hold' })).toBe(afterReady)
  })

  it('hides on an error from any phase, and stays hidden', () => {
    expect(run({ type: 'error' }).phase).toBe('hidden')
    expect(run({ type: 'hold' }, { type: 'loadEnd' }, { type: 'error' }).phase).toBe('hidden')
    const hidden = run({ type: 'error' })
    expect(loadingReducer(hidden, { type: 'loadEnd' })).toBe(hidden)
  })

  it('hides at the hard cap when load end never comes', () => {
    const loading = run({ type: 'hold' })
    expect(loadingReducer(loading, { type: 'timer', timer: 'cap' }).phase).toBe('hidden')
  })

  it('ignores a timer that no longer applies', () => {
    const hidden = run({ type: 'loadEnd' })
    expect(loadingReducer(hidden, { type: 'timer', timer: 'hold' })).toBe(hidden)
    expect(loadingReducer(hidden, { type: 'timer', timer: 'cap' })).toBe(hidden)
    const held = run({ type: 'hold' }, { type: 'loadEnd' })
    expect(loadingReducer(held, { type: 'timer', timer: 'cap' })).toBe(held)
  })
})

describe('loadingTimer', () => {
  it('runs the cap while loading, the hold timeout while held, and nothing once hidden', () => {
    expect(loadingTimer(initialLoadingState)).toEqual({ timer: 'cap', ms: HARD_CAP_MS })
    expect(loadingTimer(run({ type: 'hold' }, { type: 'loadEnd' }))).toEqual({
      timer: 'hold',
      ms: HOLD_TIMEOUT_MS,
    })
    expect(loadingTimer(run({ type: 'loadEnd' }))).toBeNull()
  })
})
