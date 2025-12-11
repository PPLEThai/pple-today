import * as Linking from 'expo-linking'
import { router } from 'expo-router'

import {
  BannerInAppType,
  CreateNewExternalNotificationBody,
  GetBannersResponse,
} from '@api/backoffice/app'
import { environment } from '@app/env'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

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

export function createLinkFromInAppNavigation(
  inAppType: BannerInAppType | 'NOTIFICATION',
  inAppId: string
) {
  switch (inAppType) {
    case 'ELECTION':
      return `/election/${inAppId}` as const
    case 'HASHTAG':
      return `/hashtag/${inAppId}` as const
    case 'ANNOUNCEMENT':
    case 'POLL':
    case 'POST':
      return `/feed/${inAppId}` as const
    case 'TOPIC':
      return `/topic/${inAppId}` as const
    case 'USER':
      return `/user/${inAppId}` as const
    case 'NOTIFICATION':
      return `/notification/${inAppId}` as const
    default:
      exhaustiveGuard(inAppType)
  }
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
