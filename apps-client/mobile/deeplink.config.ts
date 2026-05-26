type MiniAppDeepLinkNativeConfig = {
  ios?: { associatedDomains: string[] }
  android?: {
    intentFilters: Array<{
      action: string
      autoVerify: boolean
      data: Array<{ scheme: string; host: string; pathPrefix: string }>
      category: string[]
    }>
  }
}

export function getMiniAppDeepLinkNativeConfig(): MiniAppDeepLinkNativeConfig {
  const redirectOrigin = process.env.EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT

  if (!redirectOrigin) {
    return {}
  }

  let host: string

  try {
    host = new URL(redirectOrigin).host
  } catch {
    return {}
  }

  return {
    ios: {
      associatedDomains: [`applinks:${host}`],
    },
    android: {
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host,
              pathPrefix: '/',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  }
}
