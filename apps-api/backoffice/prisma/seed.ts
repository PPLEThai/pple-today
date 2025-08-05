import { PrismaPg } from '@prisma/adapter-pg'

import {
  AnnouncementType,
  FeedItemType,
  PollType,
  PrismaClient,
  UserRole,
} from '../__generated__/prisma'

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
    },
  })
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-2' },
    update: {},
    create: {
      id: 'hashtag-2',
      name: '#Announcements',
    },
  })
  await prisma.hashTag.upsert({
    where: { id: 'hashtag-3' },
    update: {},
    create: {
      id: 'hashtag-3',
      name: '#Polls',
    },
  })
  console.log('Seeded hashtags successfully.')
}

const seedPolls = async () => {
  await prisma.feedItem.upsert({
    where: { id: 'poll-1' },
    update: {},
    create: {
      id: 'poll-1',
      author: {
        connect: { id: OFFICIAL_USER_ID },
      },
      type: FeedItemType.POLL,
      poll: {
        create: {
          title: 'Poll 1',
          description: 'This is the first poll.',
          options: {
            create: [
              { id: 'option-1', title: 'Option 1' },
              { id: 'option-2', title: 'Option 2' },
              { id: 'option-3', title: 'Option 3' },
              { id: 'option-4', title: 'Option 4' },
            ],
          },
          type: PollType.SINGLE_CHOICE,
          endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Poll ends in 7 days
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
                url: 'https://picsum.photos/300?random=0',
              },
              {
                url: 'https://picsum.photos/300?random=1',
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
                url: 'https://picsum.photos/300?random=4',
              },
              {
                url: 'https://picsum.photos/300?random=5',
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
                url: 'https://picsum.photos/300?random=2',
              },
              {
                url: 'https://picsum.photos/300?random=3',
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
  await seedHashtags()
  await seedOfficialUser()
  await seedTopics()
  await seedDraftPolls()
  await seedPolls()
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
