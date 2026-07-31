import { miniAppUrlWithPath } from '../utils/mini-app-path'

export function buildMiniAppRedirectUrl(
  clientUrl: string,
  appPath: string,
  search: string,
  hash: string
): string {
  const target = miniAppUrlWithPath(clientUrl, appPath)

  if (search) {
    target.search = search
  }

  if (hash) {
    target.hash = hash
  }

  return target.toString()
}

export function parseMiniAppRequestPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  const [slug, ...rest] = segments

  return {
    slug,
    appPath: rest.join('/'),
  }
}
