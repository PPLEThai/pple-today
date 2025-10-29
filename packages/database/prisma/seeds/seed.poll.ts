import { PrismaPg } from '@prisma/adapter-pg'

import { FeedItemType, PollStatus, PollType, PrismaClient } from '../../__generated__/prisma'

const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({
  adapter,
})

const OFFICIAL_USER_ID = 'pple-official-user'

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

  // add 2 PUBLISHED + 1 ARCHIVED poll to the system
  const OPTION_AMOUNT = 4
  for (let i = 0; i < 3; ++i) {
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
            type: i === 0 ? PollType.SINGLE_CHOICE : PollType.MULTIPLE_CHOICE,
            status: i === 2 ? PollStatus.ARCHIVED : PollStatus.PUBLISHED,
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
        },
      },
    },
  })

  // add poll answer for the 3 polls
  for (let i = 0; i < 3; ++i) {
    // First 3 users vote for option 1
    for (let j = 1; j <= 3; ++j) {
      await prisma.pollAnswer.create({
        data: {
          id: `poll-answer-${i + 1}-${j}`,
          user: { connect: { id: `poll-voter-${j}` } },
          option: { connect: { id: `popt-${i * OPTION_AMOUNT + 1}` } },
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
        },
      })
    }

    // Last user votes for option 3
    await prisma.pollAnswer.create({
      data: {
        id: `poll-answer-${i + 1}-6`,
        user: { connect: { id: `poll-voter-6` } },
        option: { connect: { id: `popt-${i * OPTION_AMOUNT + 3}` } }, // 3, 7, 11
      },
    })

    // No votes for option 4 (0 votes)
  }

  console.log('Seeded draft polls successfully.')
  console.log('Seeded polls successfully.')
  console.log('Seeded poll answers successfully.')
}

async function main() {
  await seedPolls()
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
