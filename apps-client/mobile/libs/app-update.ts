import { useEffect, useState } from 'react'
import { AppState, Linking, Platform } from 'react-native'

import { fetchAndActivate, getRemoteConfig, getValue } from '@react-native-firebase/remote-config'
import Constants from 'expo-constants'
import { z } from 'zod'

import { PlatformUpdateConfigSchema, resolveUpdateRequirement } from '@app/utils/app-update-config'

import packageJson from '../package.json'

const REMOTE_CONFIG_KEY = 'CHECK_APP_UPDATE'

const AppUpdateConfigSchema = z.object({
  ios: PlatformUpdateConfigSchema,
  android: PlatformUpdateConfigSchema,
  alert: z.object({
    title: z.string(),
    message: z.string(),
    downloadButton: z.string(),
    laterButton: z.string(),
  }),
})

type AppUpdateConfig = z.infer<typeof AppUpdateConfigSchema>

const DEFAULT_CONFIG: AppUpdateConfig = {
  ios: { isForceUpdate: false, version: '0.0.0', url: '' },
  android: { isForceUpdate: false, version: '0.0.0', url: '' },
  alert: {
    title: '',
    message: '',
    downloadButton: 'อัปเดตตอนนี้',
    laterButton: 'ไว้ทีหลัง',
  },
}

export type AppUpdateStatus = {
  mode: 'soft' | 'hard'
  targetVersion: string
  storeUrl: string
  alert: AppUpdateConfig['alert']
}

let initialized = false

export function initAppUpdate() {
  if (initialized) return
  initialized = true
  const remoteConfig = getRemoteConfig()
  // React Native Firebase 25+ dropped `setConfigSettings`/`setDefaults` from the
  // modular API in favour of these setters (as in the Firebase JS SDK). Both take
  // effect on the instance immediately and reach the native SDK before the next
  // fetch, so `readConfig` needs nothing to await.
  remoteConfig.settings = {
    minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 60 * 1000,
    fetchTimeoutMillis: 60 * 1000,
  }
  remoteConfig.defaultConfig = {
    [REMOTE_CONFIG_KEY]: JSON.stringify(DEFAULT_CONFIG),
  }
}

function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? packageJson.version
}

async function readConfig(): Promise<AppUpdateConfig | null> {
  try {
    const remoteConfig = getRemoteConfig()
    await fetchAndActivate(remoteConfig)
    const raw = getValue(remoteConfig, REMOTE_CONFIG_KEY).asString()
    if (!raw) return null
    const parsed = AppUpdateConfigSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      if (__DEV__) console.warn('[AppUpdate] invalid remote config', parsed.error)
      return null
    }
    return parsed.data
  } catch (err) {
    if (__DEV__) console.warn('[AppUpdate] fetch failed', err)
    return null
  }
}

function evaluateStatus(config: AppUpdateConfig): AppUpdateStatus | null {
  const platform =
    Platform.OS === 'ios' ? config.ios : Platform.OS === 'android' ? config.android : null
  if (!platform) return null

  const requirement = resolveUpdateRequirement(getCurrentVersion(), platform)
  if (!requirement) return null

  return {
    ...requirement,
    storeUrl: platform.url,
    alert: config.alert,
  }
}

export function useAppUpdateStatus(): AppUpdateStatus | null {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const config = await readConfig()

      if (cancelled) return
      setStatus(config ? evaluateStatus(config) : null)
    }

    refresh()

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh()
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [])
  return status
}

export async function openStore(url: string) {
  if (!url) return
  try {
    await Linking.openURL(url)
  } catch (err) {
    if (__DEV__) console.warn('[AppUpdate] openStore failed', err)
  }
}
