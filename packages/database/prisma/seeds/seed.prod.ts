import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient, TopicStatus, UserStatus } from '../../__generated__/prisma'

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
const prisma = new PrismaClient({
  adapter,
})

const OFFICIAL_USER_ID = 'pple-official-user'

const seedAddresses = async (addresses: any) => {
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

const seedOfficialUser = async () => {
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
    },
  })
  console.log('Seeded official user successfully.')
}

const seedTopics = async (provinces: string[]) => {
  await prisma.$transaction(async (tx) => {
    for (const province of provinces) {
      await tx.topic.upsert({
        where: { name: province },
        update: {},
        create: {
          name: province,
          description: `ข่าวเกี่ยวกับจังหวัด${province}`,
          status: TopicStatus.PUBLISHED,
          bannerImagePath: 'public/banner/placeholder.png',
        },
      })
    }
  })
  console.log('Seeded topics successfully.')
}

async function main() {
  const { address, province } = await transformProvinceDetails()

  await seedAddresses(address)
  await seedTopics(province)
  await seedOfficialUser()
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
