import * as Linking from 'expo-linking'
import { router } from 'expo-router'

import {
  BannerInAppType,
  CreateNewExternalNotificationBody,
  GetBannersResponse,
} from '@api/backoffice/app'
import { environment } from '@app/env'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

import { getMobilePathFromInAppNavigation } from './in-app-navigation-path'
import { createMiniAppPath } from './mini-app'

type LinkType = NonNullable<CreateNewExternalNotificationBody['content']['link']>

export async function openLink(link: LinkType) {
  switch (link.type) {
    case 'MINI_APP': {
      const miniAppPath = createMiniAppPath(link.destination)
      if (!miniAppPath) throw new Error('Invalid mini app link')

      router.push(miniAppPath)
      break
    }
    case 'IN_APP_NAVIGATION': {
      const parsedLink = createLinkFromInAppNavigation(
        link.destination.inAppType,
        link.destination.inAppId
      )
      router.navigate(parsedLink)
      break
    }
    case 'EXTERNAL_BROWSER':
      await Linking.openURL(link.destination)
      break
    default:
      exhaustiveGuard(link)
  }
}

/**
 * Opens a raw URL string extracted from free-form text (e.g. a notification body).
 * If the URL matches the allowed mini app origin, it initiates the mini app flow.
 * Otherwise it falls back to opening in the external browser.
 */
export async function openUrl(url: string) {
  try {
    const miniAppPath = createMiniAppPath(url)
    if (miniAppPath) {
      router.push(miniAppPath)
      return
    }
  } catch {
    // Not a parsable URL for the mini app scheme; fall through to external browser.
  }

  await Linking.openURL(url)
}

export function createLinkFromInAppNavigation(
  inAppType: BannerInAppType | 'NOTIFICATION' | 'MINI_APP_INVITE',
  inAppId: string
) {
  return getMobilePathFromInAppNavigation(inAppType, inAppId)
}

export function convertBannerToLink(banner: GetBannersResponse[number]) {
  switch (banner.navigation) {
    case 'MINI_APP': {
      const url = new URL(environment.EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT)
      url.pathname = banner.slug

      return {
        type: 'MINI_APP' as const,
        destination: url.toString(),
      }
    }
    case 'IN_APP_NAVIGATION': {
      return {
        type: 'IN_APP_NAVIGATION' as const,
        destination: {
          inAppType: banner.inAppType,
          inAppId: banner.inAppId,
        },
      }
    }
    case 'EXTERNAL_BROWSER':
      return {
        type: 'EXTERNAL_BROWSER' as const,
        destination: banner.destination,
      }
    default:
      exhaustiveGuard(banner)
  }
}
