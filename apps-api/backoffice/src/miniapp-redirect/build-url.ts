export function buildMiniAppRedirectUrl(
  clientUrl: string,
  appPath: string,
  search: string,
  hash: string
): string {
  const target = new URL(clientUrl)
  const basePath = target.pathname.replace(/\/$/, '')
  const extraPath = appPath.replace(/^\/+/, '')

  target.pathname = extraPath ? `${basePath}/${extraPath}` : basePath

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
