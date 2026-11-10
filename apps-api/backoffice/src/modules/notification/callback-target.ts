import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

import { MiniAppSource } from '@pple-today/database/prisma'

import { decryptCallbackSecret } from './callback-secret'

/**
 * Where an app's interactive-notification answers are POSTed, and how the
 * request is authenticated. Resolved when the callback is sent, not when the
 * user answers (docs/interactive-notifications.md, "Callback — Target").
 */

// ---------------------------------------------------------------------------
// SSRF guard (pure)
// ---------------------------------------------------------------------------

const parseIpv4 = (ip: string): number[] | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null
}

const isBlockedIpv4Octets = ([a, b, c]: number[]): boolean => {
  if (a === 0) return true // "this network"
  if (a === 10) return true // private
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true // IETF protocol / TEST-NET-1
  if (a === 192 && b === 168) return true // private
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a === 198 && b === 51 && c === 100) return true // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true // TEST-NET-3
  if (a >= 224) return true // multicast, reserved, broadcast
  return false
}

/** Expand an IPv6 literal to eight 16-bit groups, or null if malformed. */
const parseIpv6 = (input: string): number[] | null => {
  let ip = input.split('%')[0].toLowerCase() // drop zone id
  // Trailing dotted IPv4 (::ffff:1.2.3.4) -> two hex groups.
  const lastColon = ip.lastIndexOf(':')
  if (ip.includes('.')) {
    const v4 = parseIpv4(ip.slice(lastColon + 1))
    if (!v4) return null
    const hi = ((v4[0] << 8) | v4[1]).toString(16)
    const lo = ((v4[2] << 8) | v4[3]).toString(16)
    ip = `${ip.slice(0, lastColon + 1)}${hi}:${lo}`
  }
  const halves = ip.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail]
  if (groups.length !== 8) return null
  const nums = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN))
  return nums.some((n) => Number.isNaN(n)) ? null : nums
}

const embeddedIpv4 = (hi: number, lo: number) => [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff]

/**
 * True for every address a callback must never reach: loopback, private,
 * link-local (incl. the 169.254.169.254 metadata address), unique-local, CGNAT,
 * multicast, reserved and documentation ranges, for both IPv4 and IPv6 (incl.
 * IPv4-mapped and NAT64 forms). Anything that fails to parse is blocked.
 */
export const isBlockedIp = (ip: string): boolean => {
  const family = isIP(ip)
  if (family === 4) {
    const octets = parseIpv4(ip)
    return octets === null || isBlockedIpv4Octets(octets)
  }
  if (family === 6) {
    const g = parseIpv6(ip)
    if (!g) return true
    if (g.every((x) => x === 0)) return true // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true // ::1
    // IPv4-mapped ::ffff:a.b.c.d, IPv4-compatible ::a.b.c.d
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
      return isBlockedIpv4Octets(embeddedIpv4(g[6], g[7]))
    }
    // NAT64 64:ff9b::/96
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
      return isBlockedIpv4Octets(embeddedIpv4(g[6], g[7]))
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
    if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
    if ((g[0] & 0xffc0) === 0xfec0) return true // fec0::/10 site-local (deprecated)
    if ((g[0] & 0xff00) === 0xff00) return true // ff00::/8 multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
    if (g[0] === 0x2002) return isBlockedIpv4Octets(embeddedIpv4(g[1], g[2])) // 6to4
    return false
  }
  return true
}

export type CallbackUrlCheck = { ok: true; url: URL } | { ok: false; reason: string }

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.lan']

/**
 * Static checks on a callback URL, no DNS: https only, no credentials, no
 * obviously internal host name, and literal IPs must be public.
 */
export const validateCallbackUrl = (raw: string): CallbackUrlCheck => {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, reason: 'Callback URL is not a valid URL' }
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'Callback URL must use https' }
  if (url.username || url.password)
    return { ok: false, reason: 'Callback URL must not contain credentials' }
  const host = hostnameOf(url)
  if (!host) return { ok: false, reason: 'Callback URL has no host' }
  if (isIP(host)) {
    if (isBlockedIp(host))
      return { ok: false, reason: 'Callback URL must not point to a private or reserved address' }
  } else if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: 'Callback URL must not point to an internal host' }
  }
  return { ok: true, url }
}

/** Hostname without IPv6 brackets or a trailing dot, lower-cased. */
const hostnameOf = (url: URL) =>
  url.hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase()

// ---------------------------------------------------------------------------
// DNS resolve-and-check
// ---------------------------------------------------------------------------

export type ResolvedAddress = { address: string; family: 4 | 6 }
export type HostLookup = (hostname: string) => Promise<ResolvedAddress[]>

export const defaultHostLookup: HostLookup = async (hostname) => {
  const results = await dnsLookup(hostname, { all: true })
  return results.map((r) => ({ address: r.address, family: r.family === 6 ? 6 : 4 }))
}

export type PublicAddressResult =
  | { ok: true; pinned: ResolvedAddress }
  | { ok: false; reason: string }

/**
 * Resolve the host and require EVERY returned address to be public (a host with
 * one public and one private A record is refused: the guard must not depend on
 * which one the client happens to pick). Returns the first address so the caller
 * can pin the connection to it and defeat DNS rebinding between check and use.
 */
export const resolvePublicAddress = async (
  url: URL,
  lookup: HostLookup = defaultHostLookup
): Promise<PublicAddressResult> => {
  const host = hostnameOf(url)
  const literal = isIP(host)
  if (literal) {
    return isBlockedIp(host)
      ? { ok: false, reason: 'Callback host is a private or reserved address' }
      : { ok: true, pinned: { address: host, family: literal === 6 ? 6 : 4 } }
  }
  let addresses: ResolvedAddress[]
  try {
    addresses = await lookup(host)
  } catch {
    return { ok: false, reason: 'Callback host could not be resolved' }
  }
  if (addresses.length === 0) return { ok: false, reason: 'Callback host could not be resolved' }
  if (addresses.some((a) => isBlockedIp(a.address)))
    return { ok: false, reason: 'Callback host resolves to a private or reserved address' }
  return { ok: true, pinned: addresses[0] }
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

export type CallbackTargetApp = {
  slug: string
  source: MiniAppSource
  notificationCallbackUrl: string | null
  notificationCallbackSecret: string | null
  /** The secret that was replaced by the last rotation; still signs until it expires. */
  notificationCallbackPreviousSecret?: string | null
  notificationCallbackPreviousSecretExpiresAt?: Date | null
}

export type CallbackTargetConfig = {
  platformRelayUrl?: string
  platformRelayToken?: string
  secretKey?: string
  /** `NOTIFICATION_CALLBACK_SECRET_KEY_PREVIOUS`: only used to decrypt. */
  secretKeyPrevious?: string
}

export type CallbackTarget = {
  kind: 'ADMIN' | 'PLATFORM'
  url: string
  /** Extra request headers (the relay's bearer). */
  headers: Record<string, string>
  /**
   * HMAC secrets for `X-PPLE-Signature`; ADMIN apps only. The current secret
   * first, then the previous one while its rotation grace window is open.
   */
  signingSecrets?: string[]
  /** Connect to this address instead of resolving again (ADMIN apps). */
  pinned?: ResolvedAddress
}

/**
 * `configError` marks a failure that is ours (unset relay or key, an app with no
 * URL or secret, a secret that cannot be decrypted), not the receiver's: those
 * do not burn delivery attempts.
 */
export type CallbackTargetResult =
  | { ok: true; target: CallbackTarget }
  | { ok: false; reason: string; configError: boolean }

export const buildPlatformRelayUrl = (relayBase: string, slug: string) =>
  `${relayBase.replace(/\/+$/, '')}/apps/${encodeURIComponent(slug)}/notification-response`

export const resolveCallbackTarget = async (
  app: CallbackTargetApp,
  config: CallbackTargetConfig,
  lookup: HostLookup = defaultHostLookup,
  now: Date = new Date()
): Promise<CallbackTargetResult> => {
  if (app.source === MiniAppSource.PLATFORM) {
    if (!config.platformRelayUrl || !config.platformRelayToken)
      return { ok: false, reason: 'Platform callback relay is not configured', configError: true }
    return {
      ok: true,
      target: {
        kind: 'PLATFORM',
        url: buildPlatformRelayUrl(config.platformRelayUrl, app.slug),
        headers: { Authorization: `Bearer ${config.platformRelayToken}` },
      },
    }
  }

  if (!app.notificationCallbackUrl)
    return { ok: false, reason: 'App has no callback URL', configError: true }
  if (!app.notificationCallbackSecret || !config.secretKey)
    return { ok: false, reason: 'App has no callback signing secret', configError: true }

  const checked = validateCallbackUrl(app.notificationCallbackUrl)
  if (!checked.ok) return { ok: false, reason: checked.reason, configError: false }

  const keys = { current: config.secretKey, previous: config.secretKeyPrevious }
  const secret = decryptCallbackSecret(app.notificationCallbackSecret, keys)
  if (!secret)
    return {
      ok: false,
      reason: 'Callback signing secret could not be decrypted',
      configError: true,
    }

  const signingSecrets = [secret]
  const previousExpiresAt = app.notificationCallbackPreviousSecretExpiresAt
  if (
    app.notificationCallbackPreviousSecret &&
    previousExpiresAt &&
    previousExpiresAt.getTime() > now.getTime()
  ) {
    // A previous secret that no longer decrypts is skipped, never fatal.
    const previous = decryptCallbackSecret(app.notificationCallbackPreviousSecret, keys)
    if (previous && previous !== secret) signingSecrets.push(previous)
  }

  const resolved = await resolvePublicAddress(checked.url, lookup)
  if (!resolved.ok) return { ok: false, reason: resolved.reason, configError: false }

  return {
    ok: true,
    target: {
      kind: 'ADMIN',
      url: checked.url.toString(),
      headers: {},
      signingSecrets,
      pinned: resolved.pinned,
    },
  }
}
