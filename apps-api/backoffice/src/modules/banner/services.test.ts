import { BannerNavigationType } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { toBannerResponse } from './to-response'

const imageUrl = (path: string) => `https://files.example/${path}`

describe('toBannerResponse', () => {
  test('a mini-app banner uses the canonical Link Name as its Today Link entry', () => {
    const [banner] = toBannerResponse(
      [
        {
          id: 'b-1',
          navigation: BannerNavigationType.MINI_APP,
          imageFilePath: 'img',
          destination: null,
          inAppId: null,
          inAppType: null,
          miniApp: { slug: 'brave-purple-lion', linkNames: [{ name: 'donate' }] },
        },
      ],
      imageUrl
    )

    expect(banner).toEqual({
      id: 'b-1',
      navigation: 'MINI_APP',
      slug: 'brave-purple-lion',
      todayLinkName: 'donate',
      imageUrl: 'https://files.example/img',
    })
  })

  test('a mini-app banner with no Link Name uses the slug', () => {
    const [banner] = toBannerResponse(
      [
        {
          id: 'b-1',
          navigation: BannerNavigationType.MINI_APP,
          imageFilePath: 'img',
          destination: null,
          inAppId: null,
          inAppType: null,
          miniApp: { slug: 'canvassing', linkNames: [] },
        },
      ],
      imageUrl
    )

    expect(banner).toMatchObject({ slug: 'canvassing', todayLinkName: 'canvassing' })
  })
})
