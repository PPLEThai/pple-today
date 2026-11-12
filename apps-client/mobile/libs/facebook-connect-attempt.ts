import { useCallback, useEffect, useRef } from 'react'
import { AppState, Linking, Platform } from 'react-native'
import { AccessToken } from 'react-native-fbsdk-next'

import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { getTrackingPermissionsAsync } from 'expo-tracking-transparency'

import { fetchClient } from './api-client'
import { getAuthSessionAsync } from './auth/session'
import {
  FacebookCachedTokenCheck,
  FacebookLoginCancelledError,
  getFacebookPageAccessToken,
} from './facebook'
import { classifySendResult, createOutbox, type SendOutcome } from './facebook-connect-outbox'
import {
  type ConnectAttemptOutcome,
  type ConnectTrace,
  type ConnectTraceContext,
  type ConnectTraceError,
  type ConnectTracePayload,
  createConnectTrace,
  describeApiError,
  describeErrorForTrace,
  describeGraphError,
  summarizeGraphPermissions,
} from './facebook-connect-trace'

/**
 * Production diagnostics for "connect a Facebook page": one trace per attempt,
 * from the button press on the profile tab to the page being linked (or the
 * user giving up), sent to `POST /facebook/connect-attempts` when it ends.
 * Sending is fire-and-forget and can never affect the flow.
 *
 * Step data must not use keys containing "token", "secret" or "password":
 * `sanitizeForTrace` drops them.
 */
export interface FacebookConnectAttempt {
  readonly referenceCode: string
  readonly finished: boolean
  record(name: string, data?: Record<string, unknown>): void
  /** End the attempt and send its trace once. Returns the reference code. */
  finish(
    outcome: ConnectAttemptOutcome,
    details?: { failedStep?: string; error?: ConnectTraceError }
  ): string
}

const CONTEXT_TIMEOUT_MS = 3000

let activeAttempt: FacebookConnectAttempt | null = null

export function getActiveFacebookConnectAttempt() {
  return activeAttempt
}

/**
 * Start a new attempt. An attempt still open from earlier (the user came back
 * without finishing) is sent as ABANDONED first.
 */
export function startFacebookConnectAttempt(entry: string = 'profile_button') {
  activeAttempt?.finish('ABANDONED', { failedStep: 'superseded' })
  const trace = createConnectTrace()
  const context = collectContext()
  let finished = false

  const attempt: FacebookConnectAttempt = {
    referenceCode: trace.referenceCode,
    get finished() {
      return finished
    },
    record: (name, data) => {
      if (!finished) trace.record(name, data)
    },
    finish(outcome, details = {}) {
      if (finished) return trace.referenceCode
      finished = true
      if (activeAttempt === attempt) activeAttempt = null
      trace.record('end', { outcome })
      void sendTrace(trace, outcome, details, context)
      return trace.referenceCode
    },
  }
  activeAttempt = attempt
  attempt.record('start', { entry })
  return attempt
}

/** The active attempt, or a new one when a screen is reached without one. */
export function getOrStartFacebookConnectAttempt(entry: string) {
  return activeAttempt ?? startFacebookConnectAttempt(entry)
}

/** Finish the active attempt, if any. Returns its reference code. */
export function finishActiveFacebookConnectAttempt(
  outcome: ConnectAttemptOutcome,
  details?: { failedStep?: string; error?: ConnectTraceError }
) {
  return activeAttempt?.finish(outcome, details) ?? null
}

/**
 * `getFacebookPageAccessToken` with every step recorded on `attempt`: the
 * cached-token check, the login and its granted and declined permissions.
 */
export async function getFacebookPageAccessTokenWithTrace(attempt: FacebookConnectAttempt) {
  let loginStarted = false
  const onCachedTokenCheck = (check: FacebookCachedTokenCheck) => {
    attempt.record('cached_token', {
      result: check.result,
      missingPermissions: check.missingPermissions,
      ...(check.error ? { error: describeErrorForTrace(check.error) } : {}),
    })
    if (check.result !== 'reused') {
      loginStarted = true
      attempt.record('login_start')
    }
  }
  try {
    const accessToken = await getFacebookPageAccessToken(onCachedTokenCheck)
    if (loginStarted) {
      const current = await AccessToken.getCurrentAccessToken().catch(() => null)
      attempt.record('login_result', {
        result: 'success',
        grantedPermissions: current?.permissions,
        declinedPermissions: current?.declinedPermissions,
        expiresAt: current ? new Date(current.expirationTime).toISOString() : undefined,
      })
    }
    return accessToken
  } catch (error) {
    if (error instanceof FacebookLoginCancelledError) {
      attempt.record('login_result', { result: 'cancelled' })
    } else {
      attempt.record('login_result', { result: 'error', error: describeErrorForTrace(error) })
    }
    throw error
  }
}

/**
 * End the active attempt after the login step threw. Returns the reference
 * code to show the user, or null when they cancelled.
 */
export function finishFacebookLoginAttempt(error: unknown) {
  if (error instanceof FacebookLoginCancelledError) {
    finishActiveFacebookConnectAttempt('CANCELLED')
    return null
  }
  const { domain, code, message } = describeErrorForTrace(error)
  return getOrStartFacebookConnectAttempt('login_error').finish('FAILED', {
    failedStep: 'login',
    error: { domain, code, message },
  })
}

/**
 * Record a failed Graph `/me/accounts` request. `useFacebookPagesQuery` throws
 * the `Response`, whose body holds Facebook's error code and `fbtrace_id`.
 */
export async function describeFacebookPagesError(error: unknown) {
  if (typeof Response !== 'undefined' && error instanceof Response) {
    let body: unknown = null
    try {
      body = await error.clone().json()
    } catch {
      // Not JSON; the status alone still says something
    }
    return describeGraphError(error.status, body)
  }
  return { error: describeErrorForTrace(error) }
}

/** The text2 line of an error toast, so a screenshot leads to the trace. */
export function referenceCodeToastText(referenceCode: string) {
  return `รหัสอ้างอิง ${referenceCode}`
}

async function fetchGraphPermissions(accessToken: string | undefined) {
  if (!accessToken) return { result: 'skipped' }
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/permissions?access_token=${encodeURIComponent(accessToken)}`
    )
    const body: unknown = await response.json()
    if (!response.ok) return { result: 'error', ...describeGraphError(response.status, body) }
    return { result: 'success', ...summarizeGraphPermissions(body) }
  } catch (error) {
    return { result: 'error', error: describeErrorForTrace(error) }
  }
}

async function collectContext(): Promise<ConnectTraceContext> {
  const [facebookAppInstalled, trackingPermission] = await Promise.all([
    Linking.canOpenURL('fbapi://').catch(() => null),
    Platform.OS === 'ios'
      ? getTrackingPermissionsAsync()
          .then((permission) => permission.status as string)
          .catch(() => 'unknown')
      : Promise.resolve(undefined),
  ])
  const expoConfig = Constants.expoConfig
  const buildNumber =
    Platform.OS === 'ios' ? expoConfig?.ios?.buildNumber : expoConfig?.android?.versionCode
  return {
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    appVersion: expoConfig?.version,
    buildNumber: buildNumber !== undefined ? String(buildNumber) : undefined,
    deviceModel: Device.modelName ?? undefined,
    facebookAppInstalled,
    trackingPermission,
  }
}

async function sendTrace(
  trace: ConnectTrace,
  outcome: ConnectAttemptOutcome,
  details: { failedStep?: string; error?: ConnectTraceError },
  context: Promise<ConnectTraceContext>
) {
  try {
    const resolvedContext = await Promise.race([
      context,
      new Promise<ConnectTraceContext>((resolve) =>
        setTimeout(() => resolve({ platform: Platform.OS }), CONTEXT_TIMEOUT_MS)
      ),
    ])
    const body = trace.toPayload({ outcome, context: resolvedContext, ...details })
    const result = await postTrace(body)
    if (result.outcome === 'retry') {
      console.warn(
        'Keeping Facebook connect attempt to send later',
        trace.referenceCode,
        result.error
      )
      await outbox.add(body, result.error ?? 'unknown')
    } else if (result.outcome === 'drop') {
      console.warn('Facebook connect attempt rejected', trace.referenceCode, result.error)
    } else {
      // The API is reachable again: send whatever an earlier failure kept
      void flushFacebookConnectOutbox()
    }
  } catch (error) {
    console.warn('Failed to send Facebook connect attempt', trace.referenceCode, error)
  }
}

const outbox = createOutbox(AsyncStorage)

async function postTrace(
  body: ConnectTracePayload
): Promise<{ outcome: SendOutcome; error?: string }> {
  try {
    const response = await fetchClient('/facebook/connect-attempts', { method: 'POST', body })
    const outcome = classifySendResult({ status: response.status })
    return outcome === 'sent' ? { outcome } : { outcome, error: `HTTP ${response.status}` }
  } catch (error) {
    // fetch itself failed: no network, or a network that blocks the API
    return {
      outcome: 'retry',
      error: describeErrorForTrace(error).message ?? 'network error',
    }
  }
}

/**
 * Send traces kept by an earlier failed send. Safe to call often: it does
 * nothing without a session or with an empty outbox, and never throws.
 */
export async function flushFacebookConnectOutbox() {
  try {
    if (!(await getAuthSessionAsync())) return 0
    return await outbox.flush(postTrace)
  } catch (error) {
    console.warn('Failed to flush Facebook connect attempts', error)
    return 0
  }
}

/** Flush kept traces on launch and whenever the app comes to the foreground. */
export function useFacebookConnectOutboxFlush() {
  useEffect(() => {
    void flushFacebookConnectOutbox()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushFacebookConnectOutbox()
    })
    return () => subscription.remove()
  }, [])
}

interface FacebookPagePickerState {
  /** Only used to ask Graph for the permissions when no page comes back; never recorded */
  facebookAccessToken: string | undefined
  pages: { id: string; name: string }[] | undefined
  pagesError: unknown
  availability: Record<string, boolean> | undefined
  availabilityError: unknown
}

/**
 * Trace the page-picker screen (`/profile/facebook`) on the active attempt:
 * the Graph `/me/accounts` result, the `/facebook/linked-page/available`
 * result, and linking a page. No pages, or a Graph error, ends the attempt as
 * FAILED; leaving the screen before a page is linked ends it as ABANDONED.
 * Picking a page again after a failed link starts a new attempt, so every
 * failure the user sees has its own reference code.
 */
export function useFacebookPagePickerTrace(state: FacebookPagePickerState) {
  const attemptRef = useRef<FacebookConnectAttempt | null>(null)
  const getAttempt = useCallback((entry: string) => {
    if (!attemptRef.current || attemptRef.current.finished) {
      attemptRef.current = getOrStartFacebookConnectAttempt(entry)
    }
    return attemptRef.current
  }, [])
  /** The screen's attempt while it is open. Refetches never start a new one. */
  const getOpenAttempt = useCallback(() => {
    const attempt = attemptRef.current
    return attempt && !attempt.finished ? attempt : null
  }, [])

  const { facebookAccessToken, pages, pagesError, availability, availabilityError } = state
  const tokenRef = useRef(facebookAccessToken)
  tokenRef.current = facebookAccessToken

  useEffect(() => {
    getAttempt('page_picker').record('page_picker_open', {
      receivedLogin: !!tokenRef.current,
    })
    return () => {
      attemptRef.current?.finish('ABANDONED', { failedStep: 'page_picker' })
    }
    // Once per screen
  }, [getAttempt])

  useEffect(() => {
    const attempt = getOpenAttempt()
    if (!pages || !attempt) return
    attempt.record('graph_accounts', {
      result: 'success',
      pageCount: pages.length,
      pages: pages.map(({ id, name }) => ({ id, name })),
    })
    if (pages.length > 0) return
    // Usually the user left every page unticked in Facebook's page selection,
    // or lacks a role on the page. The permissions tell the two apart.
    void (async () => {
      attempt.record('graph_permissions', await fetchGraphPermissions(tokenRef.current))
      attempt.finish('FAILED', {
        failedStep: 'no_pages',
        error: {
          domain: 'graph.facebook.com',
          code: 'NO_PAGES',
          message: '/me/accounts returned no pages',
        },
      })
    })()
  }, [getOpenAttempt, pages])

  useEffect(() => {
    const attempt = getOpenAttempt()
    if (!pagesError || !attempt) return
    void (async () => {
      const graphError = await describeFacebookPagesError(pagesError)
      attempt.record('graph_accounts', { result: 'error', ...graphError })
      attempt.finish('FAILED', {
        failedStep: 'graph_accounts',
        error: {
          domain: 'graph.facebook.com',
          code: graphError.code !== undefined ? String(graphError.code) : undefined,
          message: typeof graphError.message === 'string' ? graphError.message : undefined,
        },
      })
    })()
  }, [getOpenAttempt, pagesError])

  useEffect(() => {
    if (availability) getOpenAttempt()?.record('linked_page_available', { availability })
  }, [getOpenAttempt, availability])

  useEffect(() => {
    if (availabilityError) {
      getOpenAttempt()?.record('linked_page_available', {
        result: 'error',
        error: describeApiError(availabilityError),
      })
    }
  }, [getOpenAttempt, availabilityError])

  return {
    /** The code to show for a failure on this screen, without starting an attempt. */
    getReferenceCode: () => attemptRef.current?.referenceCode ?? null,
    recordLinkStart: (pageId: string) =>
      getAttempt('page_picker_retry').record('link_page_start', { pageId }),
    finishLinked: () => {
      const attempt = getAttempt('page_picker_retry')
      attempt.record('link_page_result', { result: 'success' })
      attempt.finish('SUCCESS')
    },
    /** Returns the reference code to show the user. */
    finishLinkFailed: (error: unknown) => {
      const attempt = getAttempt('page_picker_retry')
      const apiError = describeApiError(error)
      attempt.record('link_page_result', { result: 'error', ...apiError })
      return attempt.finish('FAILED', {
        failedStep: 'link_page',
        error: { domain: 'backend', code: apiError.code, message: apiError.message },
      })
    },
  }
}
