import { environment } from '@app/env'

export function createMiniAppPath(url: string) {
  const urlObj = new URL(url)

  if (urlObj.origin !== environment.EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT) {
    return null
  }

  const splitPathname = urlObj.pathname.split('/')
  const slug = splitPathname[0]
  const queryParams = splitPathname.slice(1).join('/')

  return `/mini-app/${slug}?path=${queryParams}` as const
}
