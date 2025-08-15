import { PrismaPg } from '@prisma/adapter-pg'
import * as R from 'remeda'

import {
  AnnouncementType,
  BannerNavigationType,
  FeedItemType,
  PollType,
  PrismaClient,
  UserRole,
} from '../__generated__/prisma'
const transformProvinceDetails = async () => {
  const response = await fetch(
    'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json'
  )

  if (!response.ok) {
    throw new Error('Failed to fetch province details')
  }

  const data = await response.json()

  const result: {
    province: string
    district: string
    subDistrict: string
    postalCode: string
  }[] = []

  R.forEach(data, (province) => {
    const { amphure, name_th: provinceTh } = province
    R.forEach(amphure, (district) => {
      const { name_th: districtTh, tambon } = district
      R.forEach(tambon, (subDistrict) => {
        const { name_th: subDistrictTh, zip_code: postalCodeNumber } = subDistrict
        const postalCode = postalCodeNumber.toString()

        result.push({
          province: provinceTh,
          district: districtTh,
          subDistrict: subDistrictTh,
          postalCode,
        })
      })
    })
  })

  return result
}

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
})

const OFFICIAL_USER_ID = 'official-user'

const seedAddresses = async () => {
  const provinces = await transformProvinceDetails()

  for (const { province, district, subDistrict, postalCode } of provinces) {
    await prisma.address.upsert({
      where: {
        district_subDistrict: {
          district,
          subDistrict,
        },
      },
      create: {
        province,
        district,
        subDistrict,
        postalCode,
      },
      update: {
        province,
        district,
        subDistrict,
        postalCode,
      },
    })
  }

  console.log('Seeded address successfully.')
}

const seedBanners = async () => {
  const externalBrowser = {
    destination: `https://example.com/banner`,
    navigation: 'EXTERNAL_BROWSER',
  } as const
  const inAppBrowser = {
    destination: `/feed/id`,
    navigation: 'IN_APP_NAVIGATION',
  } as const
  const miniApp = {
    destination: 'https://example.com/mini-app',
    navigation: 'MINI_APP',
  } as const
  for (let i = 1; i <= 5; ++i) {
    let navigationDetails: { destination: string; navigation: BannerNavigationType }
    switch (i % 3) {
      case 0:
        navigationDetails = externalBrowser
        break
      case 1:
        navigationDetails = inAppBrowser
        break
      default:
        navigationDetails = miniApp
        break
    }

    await prisma.banner.upsert({
      where: {
        id: `banner-${i}`,
      },
      create: {
        id: `banner-${i}`,
        imageFilePath: `local/test/banner-${i}.png`,
        status: 'PUBLISH',
        order: i,
        ...navigationDetails,
      },
      update: {
        id: `banner-${i}`,
        imageFilePath: `local/test/banner-${i}.png`,
        status: 'PUBLISH',
        order: i,
        ...navigationDetails,
      },
    })
  }
  console.log('Seeded banners successfully.')
}

const seedOfficialUser = async () => {
  await prisma.user.upsert({
    where: { id: OFFICIAL_USER_ID },
    update: {
      name: 'Official User',
      phoneNumber: '+1234567890',
      role: UserRole.OFFICIAL,
    },
    create: {
      id: OFFICIAL_USER_ID,
      name: 'Official User',
      phoneNumber: '+1234567890',
      role: UserRole.OFFICIAL,
    },
  })
  console.log('Seeded official user successfully.')
}

const seedTopics = async () => {
  await prisma.topic.upsert({
    where: { id: 'topic-1' },
    update: {},
    create: {
      id: 'topic-1',
      name: 'General Discussion',
      description: 'A place for general discussions about PPLE Today.',
      bannerImage: 'https://picsum.photos/300?random=9',
      hashTagInTopics: {
        create: [
          {
            hashTag: { connect: { id: 'hashtag-1' } },
          },
        ],
      },
    },
  })
  await prisma.topic.upsert({
    where: { id: 'topic-2' },
    update: {},
    create: {
      id: 'topic-2',
      name: 'Announcements',
      description: 'Official announcements and updates.',
      bannerImage: 'https://picsum.photos/300?random=0',
      hashTagInTopics: {
        create: [
          {
            hashTag: { connect: { id: 'hashtag-2' } },
          },
          {
            hashTag: { connect: { id: 'hashtag-3' } },
          },
        ],
      },
    },
  })
  console.log('Seeded topics successfully.')
}

const seedDraftPolls = async () => {
  await prisma.pollDraft.upsert({
    where: { id: 'draft-poll-1' },
    update: {},
    create: {
      id: 'draft-poll-1',
      title: 'Draft Poll 1',
      description: 'This is a draft poll.',
      options: {
        create: [
          { id: 'draft-option-1', title: 'Option 1' },
          { id: 'draft-option-2', title: 'Option 2' },
          { id: 'draft-option-3', title: 'Option 3' },
          { id: 'draft-option-4', title: 'Option 4' },
        ],
      },
      type: PollType.SINGLE_CHOICE,
      topics: {
        create: [
          { topic: { connect: { id: 'topic-1' } } },
          { topic: { connect: { id: 'topic-2' } } },
        ],
      },
    },
  })
  console.log('Seeded draft polls successfully.')
}

const seedHashtags = async () => {
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-1' },
    update: {},
    create: {
      id: 'hashtag-1',
      name: '#PPLEToday',
      status: 'PUBLISH',
    },
  })
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-2' },
    update: {},
    create: {
      id: 'hashtag-2',
      name: '#Announcements',
      status: 'PUBLISH',
    },
  })
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-3' },
    update: {},
    create: {
      id: 'hashtag-3',
      name: '#Polls',
      status: 'PUBLISH',
    },
  })
  console.log('Seeded hashtags successfully.')
}

const seedPolls = async () => {
  for (let i = 0; i < 20; ++i) {
    await prisma.feedItem.upsert({
      where: { id: `poll-${i + 1}` },
      update: {},
      create: {
        id: `poll-${i + 1}`,
        author: {
          connect: { id: OFFICIAL_USER_ID },
        },
        type: FeedItemType.POLL,
        poll: {
          create: {
            title: `Poll ${i + 1}`,
            description: `This is the ${i + 1}nth poll.`,
            options: {
              create: [
                { title: 'Option 1' },
                { title: 'Option 2' },
                { title: 'Option 3' },
                { title: 'Option 4' },
              ],
            },
            type: PollType.SINGLE_CHOICE,
            endAt: new Date(Date.now() + (i - 10) * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
            topics: {
              create: [
                { topic: { connect: { id: 'topic-1' } } },
                { topic: { connect: { id: 'topic-2' } } },
              ],
            },
          },
        },
      },
    })
  }
  console.log('Seeded polls successfully.')
}

const seedAnnouncements = async () => {
  await prisma.feedItem.upsert({
    where: { id: 'announcement-1' },
    update: {},
    create: {
      id: 'announcement-1',
      type: FeedItemType.ANNOUNCEMENT,
      author: {
        connect: { id: OFFICIAL_USER_ID },
      },
      announcement: {
        create: {
          title: 'Welcome to PPLE Today',
          content: 'This is the first announcement on PPLE Today.',
          type: AnnouncementType.OFFICIAL,
          backgroundColor: '#FF5733',
          attachments: {
            create: [
              {
                filePath: 'https://picsum.photos/300?random=0',
              },
              {
                filePath: 'https://picsum.photos/300?random=1',
              },
            ],
          },
        },
      },
    },
  })
  await prisma.feedItem.upsert({
    where: { id: 'announcement-2' },
    update: {},
    create: {
      id: 'announcement-2',
      type: FeedItemType.ANNOUNCEMENT,
      author: {
        connect: { id: OFFICIAL_USER_ID },
      },
      announcement: {
        create: {
          title: 'Welcome to PPLE Today',
          content: 'This is the second announcement on PPLE Today.',
          type: AnnouncementType.OFFICIAL,
          backgroundColor: '#33FF57',
          attachments: {
            create: [
              {
                filePath: 'https://picsum.photos/300?random=4',
              },
              {
                filePath: 'https://picsum.photos/300?random=5',
              },
            ],
          },
        },
      },
    },
  })
  await prisma.feedItem.upsert({
    where: { id: 'announcement-3' },
    update: {},
    create: {
      id: 'announcement-3',
      type: FeedItemType.ANNOUNCEMENT,
      author: {
        connect: { id: OFFICIAL_USER_ID },
      },
      announcement: {
        create: {
          title: 'Welcome to PPLE Today',
          content: 'This is the third announcement on PPLE Today.',
          type: AnnouncementType.OFFICIAL,
          backgroundColor: '#5733FF',
          attachments: {
            create: [
              {
                filePath: 'https://picsum.photos/300?random=2',
              },
              {
                filePath: 'https://picsum.photos/300?random=3',
              },
            ],
          },
        },
      },
    },
  })
  console.log('Seeded announcements successfully.')
}

async function main() {
  await seedAddresses()
  await seedHashtags()
  await seedOfficialUser()
  await seedTopics()
  await seedDraftPolls()
  await seedPolls()
  await seedAnnouncements()
  await seedBanners()
}

main()
  .then(() => {
    console.log('Seeding completed successfully.')
    return prisma.$disconnect()
  })
  .catch((error) => {
    console.error('Error during seeding:', error)
    return prisma.$disconnect()
  })
