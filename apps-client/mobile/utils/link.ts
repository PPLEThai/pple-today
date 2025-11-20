import * as Linking from 'expo-linking'
import { router } from 'expo-router'

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
