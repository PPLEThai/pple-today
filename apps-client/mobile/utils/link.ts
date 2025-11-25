import * as Linking from 'expo-linking'
import { router } from 'expo-router'

import { BannerInAppType, GetBannersResponse } from '@api/backoffice/app'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

import { createMiniAppPath } from './mini-app'

type LinkType =
  | {
      type: 'MINI_APP'
      value: string
    }
  | {
      type: 'IN_APP_NAVIGATION'
      value: string
    }
  | {
      type: 'EXTERNAL_BROWSER'
      value: string
    }

export async function openLink(link: LinkType) {
  switch (link.type) {
    case 'MINI_APP': {
      const miniAppPath = createMiniAppPath(link.value)
      if (!miniAppPath) throw new Error('Invalid mini app link')

      router.push(miniAppPath)
      break
    }
    case 'IN_APP_NAVIGATION':
      router.navigate(link.value as any)
      break
    case 'EXTERNAL_BROWSER':
      await Linking.openURL(link.value)
      break
    default:
      exhaustiveGuard(link)
  }
}

export function createLinkFromInAppNavigation(inAppType: BannerInAppType, inAppId: string) {
  switch (inAppType) {
    case 'ANNOUNCEMENT':
      return `/feed/${inAppId}`
    case 'ELECTION':
      return `/election/${inAppId}`
    case 'HASHTAG':
      return `/hashtag/${inAppId}`
    case 'POLL':
      return `/poll/${inAppId}`
    case 'POST':
      return `/feed/${inAppId}`
    case 'TOPIC':
      return `/topic/${inAppId}`
    case 'USER':
      return `/user/${inAppId}`
    default:
      exhaustiveGuard(inAppType)
  }
}

export function convertBannerToLink(banner: GetBannersResponse[number]) {
  switch (banner.navigation) {
    case 'MINI_APP':
      return {
        type: 'MINI_APP' as const,
        value: banner.destination,
      }
    case 'IN_APP_NAVIGATION': {
      const link = createLinkFromInAppNavigation(banner.inAppType, banner.inAppId)
      return {
        type: 'IN_APP_NAVIGATION' as const,
        value: link,
      }
    }
    case 'EXTERNAL_BROWSER':
      return {
        type: 'EXTERNAL_BROWSER' as const,
        value: banner.destination,
      }
    default:
      exhaustiveGuard(banner)
  }
}
