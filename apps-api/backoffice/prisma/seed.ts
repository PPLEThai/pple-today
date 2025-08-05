import { PrismaPg } from '@prisma/adapter-pg'

import { AnnouncementType, FeedItemType, PrismaClient, UserRole } from '../__generated__/prisma'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
})

const OFFICIAL_USER_ID = 'official-user'

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
                url: 'https://example.com/image1.png',
              },
              {
                url: 'https://example.com/image2.png',
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
                url: 'https://example.com/image1.png',
              },
              {
                url: 'https://example.com/image2.png',
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
                url: 'https://example.com/image1.png',
              },
              {
                url: 'https://example.com/image2.png',
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
  await seedOfficialUser()
  await seedAnnouncements()
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
