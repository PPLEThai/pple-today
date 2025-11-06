import * as Crypto from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'

import { PostStatus, PrismaClient, UserStatus } from '../../__generated__/prisma'

const transformProvinceDetails = async (): Promise<{
  province: string[]
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
    province: uniqueProvince,
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
const prisma = new PrismaClient({ adapter })

const OFFICIAL_USER_ID = 'pple-official-user'

const today = new Date()
const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24)

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

const seedUsers = async () => {
  // 1. Generic
  //    1. เมื่อวาน 1 คน
  //    Note: Official considered generic
  await prisma.user.upsert({
    where: { id: OFFICIAL_USER_ID },
    update: {
      name: `พรรคประชาชน - People's Party`,
      phoneNumber: '+0000000000',
      status: UserStatus.ACTIVE,
      roles: {
        connectOrCreate: {
          where: { userId_role: { userId: OFFICIAL_USER_ID, role: 'official' } },
          create: { role: 'official' },
        },
      },
      province: 'กรุงเทพมหานคร',
      district: 'คลองสาน',
      subDistrict: 'คลองสาน',
      postalCode: '10600',
      createdAt: yesterday,
    },
    create: {
      id: OFFICIAL_USER_ID,
      name: `พรรคประชาชน - People's Party`,
      phoneNumber: '+0000000000',
      status: UserStatus.ACTIVE,
      roles: {
        connectOrCreate: {
          where: { userId_role: { userId: OFFICIAL_USER_ID, role: 'official' } },
          create: { role: 'official' },
        },
      },
      province: 'กรุงเทพมหานคร',
      district: 'คลองสาน',
      subDistrict: 'คลองสาน',
      postalCode: '10600',
      createdAt: yesterday,
    },
  })
  //    2. วันนี้ 1 คน
  await prisma.user.create({
    data: {
      id: `user-generic-today-1`,
      name: `user-generic-today-1@example.com`,
      phoneNumber: Crypto.randomUUID().slice(0, 15),
      status: UserStatus.ACTIVE,
      createdAt: today,
    },
  })
  // 2. Member
  //    1. เมื่อวาน 1 คน
  //    2. วันนี้ 2 คน
  await prisma.user.create({
    data: {
      id: `user-member-yesterday-1`,
      name: `user-member-yesterday-1@example.com`,
      phoneNumber: Crypto.randomUUID().slice(0, 15),
      status: UserStatus.ACTIVE,
      roles: {
        connectOrCreate: {
          where: {
            userId_role: {
              userId: `user-member-yesterday-1`,
              role: 'pple-member:membership_permanant',
            },
          },
          create: { role: 'pple-member:membership_permanant' },
        },
      },
      province: 'กาญจนบุรี',
      district: 'ท่ามะกา',
      subDistrict: 'สนามแย้',
      postalCode: '70190',
      createdAt: yesterday,
    },
  })
  await prisma.user.create({
    data: {
      id: `user-member-today-1`,
      name: `user-member-today-1@example.com`,
      phoneNumber: Crypto.randomUUID().slice(0, 15),
      status: UserStatus.ACTIVE,
      roles: {
        connectOrCreate: {
          where: {
            userId_role: {
              userId: `user-member-today-1`,
              role: 'pple-member:membership_permanant',
            },
          },
          create: { role: 'pple-member:membership_permanant' },
        },
      },
      province: 'กาญจนบุรี',
      district: 'ท่ามะกา',
      subDistrict: 'สนามแย้',
      postalCode: '70190',
      createdAt: today,
    },
  })
  await prisma.user.create({
    data: {
      id: `user-member-today-2`,
      name: `user-member-today-2@example.com`,
      phoneNumber: Crypto.randomUUID().slice(0, 15),
      status: UserStatus.ACTIVE,
      roles: {
        connectOrCreate: {
          where: {
            userId_role: {
              userId: `user-member-today-2`,
              role: 'pple-member:membership_permanant',
            },
          },
          create: { role: 'pple-member:membership_permanant' },
        },
      },
      province: 'กระบี่',
      district: 'เกาะลันตา',
      subDistrict: 'เกาะกลาง',
      postalCode: '81120',
      createdAt: today,
    },
  })
  console.log('Seeded users successfully.')
}

const seedPosts = async () => {
  // 1. เมื่อวาน 2 โพสต์
  await prisma.feedItem.create({
    data: {
      id: `feeditem-yesterday-1`,
      authorId: OFFICIAL_USER_ID,
      type: 'POST',
      publishedAt: new Date(),
      post: {
        create: {
          facebookPostId: Crypto.randomUUID(),
          content: `This is feed item yesterday-1 content`,
          status: PostStatus.PUBLISHED,
        },
      },
      createdAt: yesterday,
    },
  })
  await prisma.feedItem.create({
    data: {
      id: `feeditem-yesterday-2`,
      authorId: OFFICIAL_USER_ID,
      type: 'POST',
      publishedAt: new Date(),
      post: {
        create: {
          facebookPostId: Crypto.randomUUID(),
          content: `This is feed item yesterday-2 content`,
          status: PostStatus.PUBLISHED,
        },
      },
      createdAt: yesterday,
    },
  })
  // 2. วันนี้ 1 โพสต์
  await prisma.feedItem.create({
    data: {
      id: `feeditem-today-1`,
      authorId: OFFICIAL_USER_ID,
      type: 'POST',
      publishedAt: new Date(),
      post: {
        create: {
          facebookPostId: Crypto.randomUUID(),
          content: `This is feed item today-1 content`,
          status: PostStatus.PUBLISHED,
        },
      },
      createdAt: today,
    },
  })
  console.log('Seeded posts successfully.')
}

const seedComments = async () => {
  // 1. เมื่อวาน 1 คอมเมนต์
  // 2. วันนี้ 1 คอมเมนต์
  await prisma.feedItemComment.createMany({
    data: [
      {
        userId: `user-member-today-1`,
        feedItemId: 'feeditem-today-1',
        content: 'yesterday',
        createdAt: yesterday,
      },
      {
        userId: `user-member-today-2`,
        feedItemId: 'feeditem-today-1',
        content: 'today',
        createdAt: today,
      },
    ],
    skipDuplicates: true,
  })
  console.log('Seeded comments successfully.')
}

const seedLikes = async () => {
  // 1. เมื่อวาน 2 ไลก์
  // 2. วันนี้ 1 ไลก์
  await prisma.feedItemReaction.createMany({
    data: [
      {
        userId: `user-member-yesterday-1`,
        feedItemId: 'feeditem-today-1',
        type: 'UP_VOTE',
        createdAt: yesterday,
      },
      {
        userId: `user-member-today-1`,
        feedItemId: 'feeditem-today-1',
        type: 'UP_VOTE',
        createdAt: yesterday,
      },
      {
        userId: `user-member-today-2`,
        feedItemId: 'feeditem-today-1',
        type: 'UP_VOTE',
        createdAt: today,
      },
    ],
    skipDuplicates: true,
  })
  console.log('Seeded likes successfully.')
}

async function main() {
  const { address } = await transformProvinceDetails()

  await seedAddresses(address)
  await seedUsers()
  await seedPosts()
  await seedComments()
  await seedLikes()
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
