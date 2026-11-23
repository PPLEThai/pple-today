import { BannerInAppType, BannerNavigationType } from '@pple-today/database/prisma'

import { GetBannersResponse } from './models'

import { readCanonicalLinkName, todayLinkEntry } from '../mini-app/link-name'

interface BannerRow {
  id: string
  navigation: BannerNavigationType
  imageFilePath: string
  destination: string | null
  inAppId: string | null
  inAppType: BannerInAppType | null
  miniApp: { slug: string; linkNames: { name: string }[] } | null
}

/** The public banner list. A mini-app banner's Today Link uses its Link Name. */
export const toBannerResponse = (
  banners: BannerRow[],
  imageUrl: (imageFilePath: string) => string
): GetBannersResponse =>
  banners.map((banner) => {
    if (banner.navigation === 'MINI_APP') {
      return {
        id: banner.id,
        navigation: banner.navigation,
        slug: banner.miniApp!.slug,
        todayLinkName: todayLinkEntry(
          banner.miniApp!.slug,
          readCanonicalLinkName(banner.miniApp!.linkNames)
        ),
        imageUrl: imageUrl(banner.imageFilePath),
      }
    }

    if (banner.navigation === 'IN_APP_NAVIGATION') {
      return {
        id: banner.id,
        navigation: banner.navigation,
        inAppId: banner.inAppId!,
        inAppType: banner.inAppType!,
        imageUrl: imageUrl(banner.imageFilePath),
      }
    }

    return {
      id: banner.id,
      navigation: banner.navigation,
      destination: banner.destination!,
      imageUrl: imageUrl(banner.imageFilePath),
    }
  })
