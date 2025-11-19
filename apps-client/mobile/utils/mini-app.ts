import { environment } from '@app/env'

export function createMiniAppPath(url: string) {
  const urlObj = new URL(url)

  if (urlObj.origin !== environment.EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT) {
    return null
  }

  if (urlObj.pathname === '/' || urlObj.pathname === '') {
    return null
  }

  // TODO: Handle query params and hash if needed
  const splitPathname = urlObj.pathname.split('/').slice(1)
  const slug = splitPathname[0]
  const queryParams = splitPathname.slice(1).join('/')

  const miniAppPath = queryParams
    ? (`/mini-app/${slug}?path=${queryParams}` as const)
    : (`/mini-app/${slug}` as const)

  return miniAppPath
}
