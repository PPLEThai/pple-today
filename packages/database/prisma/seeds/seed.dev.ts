import { PrismaPg } from '@prisma/adapter-pg'
import { LexoRank } from 'lexorank'

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
  for (let i = 1; i <= 10; i++)
    await prisma.miniApp.upsert({
      where: { id: `mini-app-${i}` },
      update: {
        name: `Sample Mini App ${i}`,
        clientId: 'sample-mini-app-client-id',
        icon: 'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iODkiIGhlaWdodD0iNzciIHZpZXdCb3g9IjAgMCA4OSA3NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjb2xvcj0iI0ZGNjQxMyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84NTJfMTIpIj4KPHBhdGggZD0iTTIuMTMzNCAwLjVIMTYuMjkyN0w0MS42NzY3IDQ0LjQ3MDlMMzMuMjE1NCA1OS4xMjY3TDAuNzUgMi44OTM1NUwyLjEzMzQgMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik00My4xMjE5IDc2LjI4NTRMMzYuMDQwNSA2NC4wMjMxTDYxLjQyNDUgMjAuMDU1N0g3OC4zNTA2TDQ1Ljg4MTggNzYuMjg1NEg0My4xMjE5WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik04OC4yNTI1IDIuODk5NjNMODEuMTcxMSAxNS4xNjE5SDMwLjM5OTdMMjEuOTM4NCAwLjUwNjA3M0g4Ni44NzI1TDg4LjI1MjUgMi44OTk2M1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg1Ml8xMiI+CjxyZWN0IHdpZHRoPSI4Ny41IiBoZWlnaHQ9Ijc1Ljc4NTYiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjc1IDAuNSkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K',
        clientUrl: 'https://example.com/mini-app',
      },
      create: {
        id: `mini-app-${i}`,
        slug: `mini-app-${i}`,
        name: `Sample Mini App ${i}`,
        icon: 'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iODkiIGhlaWdodD0iNzciIHZpZXdCb3g9IjAgMCA4OSA3NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjb2xvcj0iI0ZGNjQxMyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84NTJfMTIpIj4KPHBhdGggZD0iTTIuMTMzNCAwLjVIMTYuMjkyN0w0MS42NzY3IDQ0LjQ3MDlMMzMuMjE1NCA1OS4xMjY3TDAuNzUgMi44OTM1NUwyLjEzMzQgMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik00My4xMjE5IDc2LjI4NTRMMzYuMDQwNSA2NC4wMjMxTDYxLjQyNDUgMjAuMDU1N0g3OC4zNTA2TDQ1Ljg4MTggNzYuMjg1NEg0My4xMjE5WiIgZmlsbD0iY3VycmVudENvbG9yIi8+CjxwYXRoIGQ9Ik04OC4yNTI1IDIuODk5NjNMODEuMTcxMSAxNS4xNjE5SDMwLjM5OTdMMjEuOTM4NCAwLjUwNjA3M0g4Ni44NzI1TDg4LjI1MjUgMi44OTk2M1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg1Ml8xMiI+CjxyZWN0IHdpZHRoPSI4Ny41IiBoZWlnaHQ9Ijc1Ljc4NTYiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjc1IDAuNSkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K',
        clientId: 'sample-mini-app-client-id',
        clientUrl: 'https://example.com/mini-app',
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
  let lexorank = LexoRank.min()
  for (let i = 1, miniAppIdx = 1; i <= 15; ++i) {
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

    const status =
      i > 10
        ? BannerStatusType.PUBLISHED
        : i > 5
          ? BannerStatusType.ARCHIVED
          : BannerStatusType.DRAFT

    lexorank = lexorank.genNext()

    await prisma.banner.upsert({
      where: {
        id: `banner-${i}`,
      },
      create: {
        id: `banner-${i}`,
        imageFilePath: `public/test/banner-${(i % 2) + 1}.png`,
        headline: `Banner ${i}`,
        status: status,
        order: lexorank.toString(),
        ...navigationDetails,
      },
      update: {
        id: `banner-${i}`,
        imageFilePath: `public/test/banner-${(i % 2) + 1}.png`,
        status: status,
        order: lexorank.toString(),
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
  // add 6 mock poll voters
  for (let i = 0; i < 6; ++i) {
    await prisma.user.upsert({
      where: { id: `poll-voter-${i + 1}` },
      update: {},
      create: {
        id: `poll-voter-${i + 1}`,
        name: `PollVoter-${i + 1}`,
        phoneNumber: `+00000003${i + 1}`,
        roles: {
          connectOrCreate: {
            where: { userId_role: { userId: `poll-voter-${i + 1}`, role: 'citizen' } },
            create: { role: 'citizen' },
          },
        },
      },
    })
  }

  // add 6 PUBLISHED poll
  const OPTION_AMOUNT = 4
  for (let i = 0; i < 6; ++i) {
    await prisma.feedItem.upsert({
      where: { id: `mp-${i + 1}` },
      update: {},
      create: {
        id: `mp-${i + 1}`,
        author: {
          connect: { id: OFFICIAL_USER_ID },
        },
        publishedAt: new Date(),
        type: FeedItemType.POLL,
        poll: {
          create: {
            title: `Mock-Poll ${i + 1}`,
            description: `Mock poll ${i + 1}nth poll.`,
            options: {
              create: [
                { id: `popt-${i * OPTION_AMOUNT + 1}`, title: 'ปัญหาเศรษฐกิจสั้น ๆ', votes: 3 },
                {
                  id: `popt-${i * OPTION_AMOUNT + 2}`,
                  title: 'ปัญหาเศรษฐกิจที่เริ่มยาวขึ้นมา',
                  votes: 2,
                },
                {
                  id: `popt-${i * OPTION_AMOUNT + 3}`,
                  title: 'ปัญหาเศรษฐกิจยาวมาก ๆ ยังไม่ยาวขนาดนั้น',
                  votes: 1,
                },
                {
                  id: `popt-${i * OPTION_AMOUNT + 4}`,
                  title: 'ปัญหาเศรษฐกิจนี้ยาวมาก ทำให้ยังงงว่ามันยาวได้อีกแค่ไหนแต่จบตรงนี้แล้ว',
                  votes: 0,
                },
              ],
            },
            type: i % 2 === 0 ? PollType.SINGLE_CHOICE : PollType.MULTIPLE_CHOICE,
            status: PollStatus.PUBLISHED,
            endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalVotes: 6, // from the below condition
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

  // add 3 ARCHIVED poll
  for (let i = 0; i < 3; ++i) {
    await prisma.feedItem.upsert({
      where: { id: `archievedp-${i + 1}` },
      update: {},
      create: {
        id: `archivedp-${i + 1}`,
        author: {
          connect: { id: OFFICIAL_USER_ID },
        },
        publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        type: FeedItemType.POLL,
        poll: {
          create: {
            title: `Mock-ARCHIEVED-DONOT-SHOW-Poll ${i + 1}`,
            description: `Archieved ${i + 1}nth poll.`,
            options: {
              create: [
                { id: `notshow-${i * OPTION_AMOUNT + 1}`, title: 'DONOTSHOW!!', votes: 3 },
                {
                  id: `notshow-${i * OPTION_AMOUNT + 2}`,
                  title: 'DONOTSHOW!!',
                  votes: 2,
                },
                {
                  id: `notshow-${i * OPTION_AMOUNT + 3}`,
                  title: 'DONOTSHOW!!',
                  votes: 1,
                },
                {
                  id: `notshow-${i * OPTION_AMOUNT + 4}`,
                  title: 'DONOTSHOW!!',
                  votes: 0,
                },
              ],
            },
            type: i % 2 === 0 ? PollType.SINGLE_CHOICE : PollType.MULTIPLE_CHOICE,
            status: PollStatus.ARCHIVED,
            endAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            totalVotes: 6, // from the poll answer below count
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

  // add 1 DRAFTED poll
  await prisma.feedItem.upsert({
    where: { id: 'mdraftp-1' },
    update: {},
    create: {
      type: FeedItemType.POLL,
      author: {
        connect: { id: OFFICIAL_USER_ID },
      },
      poll: {
        create: {
          endAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          title: 'Draft Poll 1',
          description: 'This is a draft poll.',
          status: PollStatus.DRAFT,
          options: {
            create: [
              { id: 'dopt-1', title: 'Option 1' },
              { id: 'dopt-2', title: 'Option 2' },
              { id: 'dopt-3', title: 'Option 3' },
              { id: 'dopt-4', title: 'Option 4' },
            ],
          },
          type: PollType.SINGLE_CHOICE,
          topics: {
            create: [{ topic: { connect: { id: 'topic-1' } } }],
          },
          totalVotes: 0,
        },
      },
    },
  })

  // add poll answer for the PUBLISHED 6 polls
  for (let i = 0; i < 6; ++i) {
    // First 3 users vote for option 1
    for (let j = 1; j <= 3; ++j) {
      await prisma.pollAnswer.create({
        data: {
          id: `poll-answer-${i + 1}-${j}`,
          user: { connect: { id: `poll-voter-${j}` } },
          option: { connect: { id: `popt-${i * OPTION_AMOUNT + 1}` } },
          poll: {
            connect: {
              feedItemId: `mp-${i + 1}`,
            },
          },
        },
      })
    }

    // Next 2 users vote for option 2
    for (let j = 4; j <= 5; ++j) {
      await prisma.pollAnswer.create({
        data: {
          id: `poll-answer-${i + 1}-${j}`,
          user: { connect: { id: `poll-voter-${j}` } },
          option: { connect: { id: `popt-${i * OPTION_AMOUNT + 2}` } },
          poll: {
            connect: {
              feedItemId: `mp-${i + 1}`,
            },
          },
        },
      })
    }

    // Last user votes for option 3
    await prisma.pollAnswer.create({
      data: {
        id: `poll-answer-${i + 1}-6`,
        user: { connect: { id: `poll-voter-6` } },
        option: { connect: { id: `popt-${i * OPTION_AMOUNT + 3}` } }, // 3, 7, 11
        poll: {
          connect: {
            feedItemId: `mp-${i + 1}`,
          },
        },
      },
    })

    // No votes for option 4 (0 votes)
  }

  // add poll answer to ARCHIVED POLL
  for (let i = 0; i < 3; ++i) {
    // First 3 users vote for option 1
    for (let j = 1; j <= 3; ++j) {
      await prisma.pollAnswer.create({
        data: {
          id: `not-answer-${i + 1}-${j}`,
          user: { connect: { id: `poll-voter-${j}` } },
          option: { connect: { id: `notshow-${i * OPTION_AMOUNT + 1}` } },
          poll: {
            connect: {
              feedItemId: `archivedp-${i + 1}`,
            },
          },
        },
      })
    }

    // Next 2 users vote for option 2
    for (let j = 4; j <= 5; ++j) {
      await prisma.pollAnswer.create({
        data: {
          id: `not-answer-${i + 1}-${j}`,
          user: { connect: { id: `poll-voter-${j}` } },
          option: { connect: { id: `notshow-${i * OPTION_AMOUNT + 2}` } },
          poll: {
            connect: {
              feedItemId: `archivedp-${i + 1}`,
            },
          },
        },
      })
    }

    // Last user votes for option 3
    await prisma.pollAnswer.create({
      data: {
        id: `not-answer-${i + 1}-6`,
        user: { connect: { id: `poll-voter-6` } },
        option: { connect: { id: `notshow-${i * OPTION_AMOUNT + 3}` } },
        poll: {
          connect: {
            feedItemId: `archivedp-${i + 1}`,
          },
        },
      },
    })

    // No votes for option 4 (0 votes)
  }

  console.log('Seeded draft polls successfully.')
  console.log('Seeded PUBLISHED polls successfully.')
  console.log('Seeded ARCHIEVED polls successfully.')
  console.log('Seeded poll answers successfully.')
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
