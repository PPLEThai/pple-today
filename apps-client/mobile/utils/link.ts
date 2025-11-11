import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { openBrowserAsync } from 'expo-web-browser'

import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

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
    case 'MINI_APP':
      // TODO: Implement mini app opening logic
      await openBrowserAsync(link.value)
      break
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
