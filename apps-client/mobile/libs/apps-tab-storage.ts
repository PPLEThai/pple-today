import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'

import { pushRecent } from '@app/utils/apps-tab'

/**
 * Per-device state for the แอปฯ tab. None of it is load-bearing: if storage
 * fails, the tab still renders with its defaults, so every read and write
 * swallows errors.
 */

const RECENTS_PREFIX = 'apps-tab:recents:'
const SECTION_OPEN_PREFIX = 'apps-tab:section-open:'

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Best effort.
  }
}

/** A value persisted under `key`; `undefined` until it has loaded. */
function usePersistedValue<T>(key: string | null) {
  const [state, setState] = useState<{ key: string | null; value: T | null | undefined }>({
    key,
    value: undefined,
  })

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    readJson<T>(key).then((value) => {
      if (!cancelled) setState({ key, value })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  const set = useCallback(
    (update: (previous: T | null) => T) => {
      if (key === null) return
      setState((previous) => {
        const next = update(previous.key === key ? (previous.value ?? null) : null)
        writeJson(key, next)
        return { key, value: next }
      })
    },
    [key]
  )

  // A stale value from the previous key must not leak into the new one.
  const value = state.key === key ? state.value : undefined
  return [value, set] as const
}

/**
 * Recently opened apps, newest first. Keyed per active person, because the app
 * list is role-scoped: a สส.'s recents mean nothing under ส่วนกลาง. A user with no
 * active person yet gets a key of their own.
 */
export function useRecentMiniApps(activePersonId: number | null) {
  const [recents, setRecents] = usePersistedValue<string[]>(
    `${RECENTS_PREFIX}${activePersonId ?? 'none'}`
  )
  const record = useCallback(
    (slug: string) => setRecents((previous) => pushRecent(previous ?? [], slug)),
    [setRecents]
  )
  return { recents: recents ?? [], record }
}

/** Forget every person's recents — on logout, so the next user starts clean. */
export async function clearRecentMiniApps(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(RECENTS_PREFIX)))
  } catch {
    // Best effort.
  }
}

/**
 * Whether a collapsible section of the แอปฯ tab is open. Sections start
 * collapsed; the user's choice is remembered on this device.
 */
export function useSectionOpen(section: 'beta' | 'draft') {
  const [open, setOpen] = usePersistedValue<boolean>(`${SECTION_OPEN_PREFIX}${section}`)
  const choose = useCallback((next: boolean) => setOpen(() => next), [setOpen])
  return { open: open ?? false, loaded: open !== undefined, choose }
}

/**
 * The app whose invitation was just accepted, so the แอปฯ tab can open the
 * แอปทดลองใช้ section once and point at it. In memory only: it is a one-off nudge,
 * not a preference.
 */
let justAcceptedSlug: string | null = null
const listeners = new Set<() => void>()

export function announceAcceptedInvite(slug: string): void {
  justAcceptedSlug = slug
  listeners.forEach((listener) => listener())
}

export function clearAcceptedInvite(): void {
  if (justAcceptedSlug === null) return
  justAcceptedSlug = null
  listeners.forEach((listener) => listener())
}

export function useJustAcceptedInvite(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => justAcceptedSlug
  )
}
