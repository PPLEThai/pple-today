import { PrismaPg } from '@prisma/adapter-pg'

import {
  AnnouncementStatus,
  AnnouncementType,
  BannerStatusType,
  FeedItemType,
  HashTagStatus,
  PollStatus,
  PollType,
  PrismaClient,
  TopicStatus,
} from '../../__generated__/prisma'

const transformProvinceDetails = async (): Promise<{
  provinces: string[]
  address: {
    postalCode: string
    province: string
    district: string
    subDistrict: string
  }[]
}> => {
  const response = await fetch(
    'https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/refs/heads/master/jquery.Thailand.js/database/raw_database/raw_database.json'
  )

  if (!response.ok) {
    throw new Error('Failed to fetch province details')
  }

  const data: {
    zipcode: number
    province: string
    amphoe: string
    district: string
  }[] = await response.json()

  const onlyProvince = data.map(({ province }) => province)
  const uniqueProvince = Array.from(new Set<string>(onlyProvince))

  return {
    provinces: uniqueProvince,
    address: data.map(({ zipcode, amphoe, province, district }) => ({
      postalCode: zipcode.toString(),
      province,
      district: amphoe,
      subDistrict: district,
    })),
  }
}

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
})

const OFFICIAL_USER_ID = 'pple-official-user'

const seedAddresses = async (
  addresses: {
    postalCode: string
    province: string
    district: string
    subDistrict: string
  }[]
) => {
  for (const { province, district, subDistrict, postalCode } of addresses) {
    await prisma.address.upsert({
      where: {
        province_district_subDistrict_postalCode: {
          province,
          district,
          subDistrict,
          postalCode,
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

const seedMiniApps = async () => {
  await prisma.miniApp.upsert({
    where: { id: 'mini-app-1' },
    update: {
      name: 'Sample Mini App',
      clientId: 'sample-mini-app-client-id',
      icon: 'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iODkiIGhlaWdodD0iNzciIHZpZXdCb3g9IjAgMCA4OSA3NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjb2xvcj0iI0ZGNjQxMyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84NTJfMTIpIj4KPHBhdGggZD0iTTIuMTMzNCAwLjVIMTYuMjkyN0w0MS42NzY3IDQ0LjQ3MDlMMzMuMjE1NCA1OS4xMjY3TDAuNzUgMi44OTM1NUwyLjEzMzQgMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik00My4xMjE5IDc2LjI4NTRMMzYuMDQwNSA2NC4wMjMxTDYxLjQyNDUgMjAuMDU1N0g3OC4zNTA2TDQ1Ljg4MTggNzYuMjg1NEg0My4xMjE5WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik04OC4yNTI1IDIuODk5NjNMODEuMTcxMSAxNS4xNjE5SDMwLjM5OTdMMjEuOTM4NCAwLjUwNjA3M0g4Ni44NzI1TDg4LjI1MjUgMi44OTk2M1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg1Ml8xMiI+CjxyZWN0IHdpZHRoPSI4Ny41IiBoZWlnaHQ9Ijc1Ljc4NTYiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjc1IDAuNSkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K',
      clientUrl: 'https://example.com/mini-app',
    },
    create: {
      id: 'mini-app-1',
      slug: 'mini-app-1',
      name: 'Sample Mini App',
      icon: 'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iODkiIGhlaWdodD0iNzciIHZpZXdCb3g9IjAgMCA4OSA3NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjb2xvcj0iI0ZGNjQxMyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84NTJfMTIpIj4KPHBhdGggZD0iTTIuMTMzNCAwLjVIMTYuMjkyN0w0MS42NzY3IDQ0LjQ3MDlMMzMuMjE1NCA1OS4xMjY3TDAuNzUgMi44OTM1NUwyLjEzMzQgMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik00My4xMjE5IDc2LjI4NTRMMzYuMDQwNSA2NC4wMjMxTDYxLjQyNDUgMjAuMDU1N0g3OC4zNTA2TDQ1Ljg4MTggNzYuMjg1NEg0My4xMjE5WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik04OC4yNTI1IDIuODk5NjNMODEuMTcxMSAxNS4xNjE5SDMwLjM5OTdMMjEuOTM4NCAwLjUwNjA3M0g4Ni44NzI1TDg4LjI1MjUgMi44OTk2M1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg1Ml8xMiI+CjxyZWN0IHdpZHRoPSI4Ny41IiBoZWlnaHQ9Ijc1Ljc4NTYiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjc1IDAuNSkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K',
      clientId: 'sample-mini-app-client-id',
      clientUrl: 'https://example.com/mini-app',
    },
  })
  await prisma.miniApp.upsert({
    where: { id: 'mini-app-2' },
    update: {
      name: 'Another Mini App',
      clientId: 'another-mini-app-client-id',
      icon: 'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iODkiIGhlaWdodD0iNzciIHZpZXdCb3g9IjAgMCA4OSA3NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjb2xvcj0iI0ZGNjQxMyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84NTJfMTIpIj4KPHBhdGggZD0iTTIuMTMzNCAwLjVIMTYuMjkyN0w0MS42NzY3IDQ0LjQ3MDlMMzMuMjE1NCA1OS4xMjY3TDAuNzUgMi44OTM1NUwyLjEzMzQgMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik00My4xMjE5IDc2LjI4NTRMMzYuMDQwNSA2NC4wMjMxTDYxLjQyNDUgMjAuMDU1N0g3OC4zNTA2TDQ1Ljg4MTggNzYuMjg1NEg0My4xMjE5WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik04OC4yNTI1IDIuODk5NjNMODEuMTcxMSAxNS4xNjE5SDMwLjM5OTdMMjEuOTM4NCAwLjUwNjA3M0g4Ni44NzI1TDg4LjI1MjUgMi44OTk2M1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg1Ml8xMiI+CjxyZWN0IHdpZHRoPSI4Ny41IiBoZWlnaHQ9Ijc1Ljc4NTYiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjc1IDAuNSkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K',
      clientUrl: 'https://example.com/another-mini-app',
    },
    create: {
      id: 'mini-app-2',
      slug: 'mini-app-2',
      name: 'Another Mini App',
      clientId: 'another-mini-app-client-id',
      icon: 'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iODkiIGhlaWdodD0iNzciIHZpZXdCb3g9IjAgMCA4OSA3NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjb2xvcj0iI0ZGNjQxMyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84NTJfMTIpIj4KPHBhdGggZD0iTTIuMTMzNCAwLjVIMTYuMjkyN0w0MS42NzY3IDQ0LjQ3MDlMMzMuMjE1NCA1OS4xMjY3TDAuNzUgMi44OTM1NUwyLjEzMzQgMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik00My4xMjE5IDc2LjI4NTRMMzYuMDQwNSA2NC4wMjMxTDYxLjQyNDUgMjAuMDU1N0g3OC4zNTA2TDQ1Ljg4MTggNzYuMjg1NEg0My4xMjE5WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik04OC4yNTI1IDIuODk5NjNMODEuMTcxMSAxNS4xNjE5SDMwLjM5OTdMMjEuOTM4NCAwLjUwNjA3M0g4Ni44NzI1TDg4LjI1MjUgMi44OTk2M1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg1Ml8xMiI+CjxyZWN0IHdpZHRoPSI4Ny41IiBoZWlnaHQ9Ijc1Ljc4NTYiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjc1IDAuNSkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K',
      clientUrl: 'https://example.com/another-mini-app',
    },
  })
  console.log('Seeded mini apps successfully.')
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
  for (let i = 1, miniAppIdx = 1; i <= 5; ++i) {
    let navigationDetails
    switch (i % 3) {
      case 0:
        navigationDetails = externalBrowser
        break
      case 1:
        navigationDetails = inAppBrowser
        break
      default:
        navigationDetails = {
          miniAppId: `mini-app-${miniAppIdx++}`,
          navigation: 'MINI_APP',
        } as const
        break
    }

    await prisma.banner.upsert({
      where: {
        id: `banner-${i}`,
      },
      create: {
        id: `banner-${i}`,
        imageFilePath: `public/test/banner-${i}.png`,
        status: BannerStatusType.PUBLISHED,
        order: i,
        startAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        ...navigationDetails,
      },
      update: {
        id: `banner-${i}`,
        imageFilePath: `public/test/banner-${i}.png`,
        status: BannerStatusType.PUBLISHED,
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
      name: `พรรคประชาชน - People's Party`,
      phoneNumber: '+0000000000',
      roles: {
        connectOrCreate: {
          where: { userId_role: { userId: OFFICIAL_USER_ID, role: 'official' } },
          create: { role: 'official' },
        },
      },
    },
    create: {
      id: OFFICIAL_USER_ID,
      name: `พรรคประชาชน - People's Party`,
      phoneNumber: '+0000000000',
      roles: {
        connectOrCreate: {
          where: { userId_role: { userId: OFFICIAL_USER_ID, role: 'official' } },
          create: { role: 'official' },
        },
      },
    },
  })
  console.log('Seeded official user successfully.')
}

const seedTopics = async (provinces: any[]) => {
  await prisma.$transaction(async (tx) => {
    for (const province of provinces) {
      await tx.topic.upsert({
        where: { name: province },
        update: {},
        create: {
          name: province,
          description: `ข่าวเกี่ยวกับจังหวัด${province}`,
          status: TopicStatus.PUBLISHED,
        },
      })
    }
  })
  await prisma.topic.upsert({
    where: { id: 'topic-1' },
    update: {},
    create: {
      id: 'topic-1',
      name: 'Education',
      description: 'All about education',
      status: TopicStatus.PUBLISHED,
      bannerImagePath: `public/test/banner-1.png`,
    },
  })
  await prisma.topic.upsert({
    where: { id: 'topic-2' },
    update: {},
    create: {
      id: 'topic-2',
      name: 'Economy',
      description: 'All about economy',
      status: TopicStatus.PUBLISHED,
      bannerImagePath: `public/test/banner-2.png`,
    },
  })
  console.log('Seeded topics successfully.')
}

const seedHashtags = async () => {
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-1' },
    update: {},
    create: {
      id: 'hashtag-1',
      name: '#PPLEToday',
      status: HashTagStatus.PUBLISHED,
    },
  })
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-2' },
    update: {},
    create: {
      id: 'hashtag-2',
      name: '#Announcements',
      status: HashTagStatus.PUBLISHED,
    },
  })
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-3' },
    update: {},
    create: {
      id: 'hashtag-3',
      name: '#Polls',
      status: HashTagStatus.PUBLISHED,
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
        publishedAt: new Date(),
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
            status: PollStatus.PUBLISHED,
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

  await prisma.feedItem.upsert({
    where: { id: 'draft-poll-1' },
    update: {},
    create: {
      type: FeedItemType.POLL,
      author: {
        connect: { id: OFFICIAL_USER_ID },
      },
      poll: {
        create: {
          endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          title: 'Draft Poll 1',
          description: 'This is a draft poll.',
          status: PollStatus.DRAFT,
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
      },
    },
  })
  console.log('Seeded draft polls successfully.')
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
      publishedAt: new Date(),
      announcement: {
        create: {
          title: 'Welcome to PPLE Today',
          content: 'This is the first announcement on PPLE Today.',
          type: AnnouncementType.OFFICIAL,
          status: AnnouncementStatus.PUBLISHED,
          attachments: {
            create: [
              {
                filePath: 'public/test/banner-1.png',
              },
              {
                filePath: 'public/test/banner-2.png',
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
      publishedAt: new Date(),
      announcement: {
        create: {
          title: 'Welcome to PPLE Today',
          content: 'This is the second announcement on PPLE Today.',
          type: AnnouncementType.OFFICIAL,
          status: AnnouncementStatus.PUBLISHED,
          attachments: {
            create: [
              {
                filePath: 'public/test/banner-1.png',
              },
              {
                filePath: 'public/test/banner-2.png',
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
      publishedAt: new Date(),
      announcement: {
        create: {
          title: 'Welcome to PPLE Today',
          content: 'This is the third announcement on PPLE Today.',
          type: AnnouncementType.OFFICIAL,
          status: AnnouncementStatus.PUBLISHED,
          attachments: {
            create: [
              {
                filePath: 'public/test/banner-1.png',
              },
              {
                filePath: 'public/test/banner-2.png',
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
  const { address, provinces } = await transformProvinceDetails()

  await seedAddresses(address)
  await seedHashtags()
  await seedMiniApps()
  await seedOfficialUser()
  await seedTopics(provinces)
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
