import { PrismaPg } from '@prisma/adapter-pg'

import { ElectionType, EligibleVoterType, Prisma, PrismaClient } from '../../__generated__/prisma'

const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({
  adapter,
})

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date)
  copy.setDate(date.getDate() + days)
  return copy
}

const seedElections = async (userId: string) => {
  const dateNow = new Date()

  // create mock user
  const userId1 = 'seed-election-user-1'
  const userId2 = 'seed-election-user-2'
  await prisma.user.upsert({
    where: {
      id: userId1,
    },
    create: {
      id: userId1,
      name: userId1,
      phoneNumber: userId1,
    },
    update: {},
  })
  await prisma.user.upsert({
    where: {
      id: userId2,
    },
    create: {
      id: userId2,
      name: userId2,
      phoneNumber: userId2,
    },
    update: {},
  })

  const data = [
    // online
    // no eligible voter
    {
      id: 'seed-online-with-no-eligible',
      name: 'seed-online-with-no-eligible',
      type: ElectionType.ONLINE,
      publishDate: dateNow,
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
    },
    // onsite
    // not publish
    {
      id: 'seed-onsite-not-publish',
      name: 'seed-onsite-not-publish',
      type: ElectionType.ONSITE,
      publishDate: addDays(dateNow, 1),
      openVoting: addDays(dateNow, 2),
      closeVoting: addDays(dateNow, 3),
      voters: {
        create: {
          id: 'seed-onsite-not-publish-voter',
          userId: userId,
          type: EligibleVoterType.ONSITE,
        },
      },
    },
    // hybrid
    // wait register
    {
      id: 'seed-hybrid-wait-register',
      name: 'seed-hybrid-wait-register',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, 1),
      closeRegister: addDays(dateNow, 2),
      openVoting: addDays(dateNow, 3),
      closeVoting: addDays(dateNow, 4),
      voters: {
        create: {
          id: 'seed-hybrid-wait-register-voter',
          userId: userId,
          type: EligibleVoterType.ONSITE,
        },
      },
    },
    // hybrid
    // open register
    {
      id: 'seed-hybrid-open-register-not-registed',
      name: 'seed-hybrid-open-register',
      type: ElectionType.HYBRID,
      openRegister: dateNow,
      closeRegister: addDays(dateNow, 1),
      openVoting: addDays(dateNow, 2),
      closeVoting: addDays(dateNow, 3),
      voters: {
        create: {
          id: 'seed-hybrid-open-register-voter',
          userId: userId,
          type: EligibleVoterType.ONSITE,
        },
      },
    },
    // hybrid
    // close register
    {
      id: 'seed-hybrid-close-register',
      name: 'seed-hybrid-close-register',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -3),
      closeRegister: addDays(dateNow, -2),
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
      voters: {
        create: {
          id: 'seed-hybrid-close-register-voter',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
    // hybrid
    // open vote
    {
      id: 'seed-hybrid-open-vote',
      name: 'seed-hybrid-open-vote',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -2),
      closeRegister: addDays(dateNow, -1),
      openVoting: dateNow,
      closeVoting: addDays(dateNow, 1),
      voters: {
        create: {
          id: 'seed-hybrid-open-vote-voter-1',
          userId: userId,
          type: EligibleVoterType.ONLINE,
          bollot: {
            create: {
              id: 'seed-hybrid-open-vote-voter-1-bollot',
              encryptedBallot: 'mock-encrypted-bollot',
              location: 'mock-location',
              faceImageURL: 'mock-faceImageURL',
            },
          },
        },
        createMany: {
          data: [
            {
              id: 'seed-hybrid-open-vote-voter-2',
              userId: userId1,
              type: EligibleVoterType.ONLINE,
            },
            {
              id: 'seed-hybrid-open-vote-voter-3',
              userId: userId2,
              type: EligibleVoterType.ONLINE,
            },
          ],
        },
      },
    },
    // hybrid
    // closed vote
    {
      id: 'seed-hybrid-close-vote',
      name: 'seed-hybrid-close-vote',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -4),
      closeRegister: addDays(dateNow, -3),
      openVoting: addDays(dateNow, -2),
      closeVoting: addDays(dateNow, -1),
      voters: {
        create: {
          id: 'seed-hybrid-close-vote-voter',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
    // hybrid
    // result announcement
    {
      id: 'seed-hybrid-result-announcement',
      name: 'seed-hybrid-result-announcement',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -4),
      closeRegister: addDays(dateNow, -3),
      openVoting: addDays(dateNow, -2),
      closeVoting: addDays(dateNow, -1),
      startResult: dateNow,
      endResult: addDays(dateNow, 1),
      voters: {
        create: {
          id: 'seed-hybrid-result-annoucement',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
    // hybrid
    // close result announcement
    {
      id: 'seed-hybrid-close-result-announcement',
      name: 'seed-hybrid-close-result-announcement',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -6),
      closeRegister: addDays(dateNow, -5),
      openVoting: addDays(dateNow, -4),
      closeVoting: addDays(dateNow, -3),
      startResult: addDays(dateNow, -2),
      endResult: addDays(dateNow, -1),
      voters: {
        create: {
          id: 'seed-hybrid-close-result-announcement-voter',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
  ] satisfies Prisma.ElectionCreateInput[]

  for (const d of data) {
    await prisma.election.upsert({
      where: { id: d.id },
      create: d,
      update: {
        openRegister: d.openRegister,
        closeRegister: d.closeRegister,
        openVoting: d.openVoting,
        closeVoting: d.closeRegister,
        startResult: d.startResult,
        endResult: d.endResult,
      },
    })
  }
}

process.stdin.setEncoding('utf8')
console.log('Enter your userId:')
process.stdin.on('data', (data) => {
  const userId = data.toString().trim()
  seedElections(userId)
    .then(() => {
      console.log('seed elections success')
      prisma.$disconnect()
      return process.exit()
    })
    .catch((error) => {
      console.log('seed elections failed', error)
      prisma.$disconnect()
      return process.exit()
    })
})
