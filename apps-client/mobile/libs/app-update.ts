import { useEffect, useState } from 'react'
import { AppState, Linking, Platform } from 'react-native'

import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  setConfigSettings,
  setDefaults,
} from '@react-native-firebase/remote-config'
import Constants from 'expo-constants'
import semver from 'semver'
import { z } from 'zod'

import packageJson from '../package.json'

const REMOTE_CONFIG_KEY = 'CHECK_APP_UPDATE'

const PlatformConfigSchema = z.object({
  isForceUpdate: z.boolean(),
  version: z.string(),
  url: z.string(),
})

const AppUpdateConfigSchema = z.object({
  ios: PlatformConfigSchema,
  android: PlatformConfigSchema,
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
  setConfigSettings(remoteConfig, {
    minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 60 * 1000,
    fetchTimeMillis: 60 * 1000,
  })
  setDefaults(remoteConfig, {
    [REMOTE_CONFIG_KEY]: JSON.stringify(DEFAULT_CONFIG),
  }).catch((err) => {
    if (__DEV__) console.warn('[AppUpdate] setDefaults failed', err)
  })
}

function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? packageJson.version
}

function coerceSemver(value: string): string | null {
  const coerced = semver.coerce(value)
  return coerced ? coerced.version : null
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

  const current = coerceSemver(getCurrentVersion())
  const target = coerceSemver(platform.version)
  if (!current || !target) return null
  if (!semver.lt(current, target)) return null

  return {
    mode: platform.isForceUpdate ? 'hard' : 'soft',
    targetVersion: platform.version,
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
