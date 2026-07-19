import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, ok } from 'neverthrow'

/** The mini app facts needed to build a self-link destination. */
export interface AppLinkPathTarget {
  slug: string
}

const invalidLinkPath = (message: string) =>
  err({
    code: InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH,
    message,
  })

/**
 * Validate a Builder App's path-only self-link and join it to that app's known
 * redirect entry (`{origin}/{slug}{linkPath}`).
 *
 * The result is a normal `MINI_APP` notification destination the existing
 * client already understands — not a new client-only field. Cross-app /
 * absolute / host-bearing values are refused so an app can deep-link into
 * itself and nowhere else.
 */
export const resolveAppLinkPath = (
  linkPath: string,
  app: AppLinkPathTarget,
  redirectOrigin: string
) => {
  if (typeof linkPath !== 'string' || linkPath.trim() !== linkPath || linkPath.length === 0) {
    return invalidLinkPath('linkPath must be a non-empty path starting with /')
  }

  if (!linkPath.startsWith('/') || linkPath.startsWith('//')) {
    return invalidLinkPath('linkPath must be a path starting with a single /')
  }

  if (
    linkPath.includes('://') ||
    linkPath.includes('\\') ||
    linkPath.includes('?') ||
    linkPath.includes('#')
  ) {
    return invalidLinkPath('linkPath must be path-only (no scheme, host, query, or hash)')
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(linkPath)
  } catch {
    return invalidLinkPath('linkPath contains invalid percent-encoding')
  }

  const segments = decoded.split('/').filter((segment) => segment.length > 0)
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return invalidLinkPath('linkPath must not contain . or .. segments')
  }

  const origin = redirectOrigin.replace(/\/$/, '')
  // Join the decoded path so percent-encoded segments cannot diverge from the
  // validation above (which already rejected `.` / `..` after decoding).
  const subPath = decoded === '/' ? '' : decoded
  const destination = `${origin}/${app.slug}${subPath}`

  return ok({
    type: 'MINI_APP' as const,
    destination,
  })
}
