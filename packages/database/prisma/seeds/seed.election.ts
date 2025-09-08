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
  const userId1 = 'election-user-1'
  const userId2 = 'election-user-2'
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

  const elections = [
    // online
    // no eligible voter
    {
      id: 'online-with-no-eligible',
      name: 'online-with-no-eligible',
      type: ElectionType.ONLINE,
      publishDate: dateNow,
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
    },
    // onsite
    // not publish
    {
      id: 'onsite-not-publish',
      name: 'onsite-not-publish',
      type: ElectionType.ONSITE,
      publishDate: addDays(dateNow, 1),
      openVoting: addDays(dateNow, 2),
      closeVoting: addDays(dateNow, 3),
      voters: {
        create: {
          id: 'onsite-not-publish-voter',
          userId: userId,
          type: EligibleVoterType.ONSITE,
        },
      },
    },
    // onsite
    // exceed close vote date for 7 days
    {
      id: 'onsite-exceed-close-vote-date-limit',
      name: 'onsite-exceed-close-vote-date-limit',
      type: ElectionType.ONSITE,
      publishDate: addDays(dateNow, -20),
      openVoting: addDays(dateNow, -10),
      closeVoting: addDays(dateNow, -9),
    },
    // hybrid
    // wait register
    {
      id: 'hybrid-wait-register',
      name: 'hybrid-wait-register',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, 1),
      closeRegister: addDays(dateNow, 2),
      openVoting: addDays(dateNow, 3),
      closeVoting: addDays(dateNow, 4),
      voters: {
        create: {
          id: 'hybrid-wait-register-voter',
          userId: userId,
          type: EligibleVoterType.ONSITE,
        },
      },
    },
    // hybrid
    // open register
    {
      id: 'hybrid-open-register-not-registed',
      name: 'hybrid-open-register',
      type: ElectionType.HYBRID,
      openRegister: dateNow,
      closeRegister: addDays(dateNow, 1),
      openVoting: addDays(dateNow, 2),
      closeVoting: addDays(dateNow, 3),
      voters: {
        create: {
          id: 'hybrid-open-register-voter',
          userId: userId,
          type: EligibleVoterType.ONSITE,
        },
      },
    },
    // hybrid
    // close register
    {
      id: 'hybrid-close-register',
      name: 'hybrid-close-register',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -3),
      closeRegister: addDays(dateNow, -2),
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
      voters: {
        create: {
          id: 'hybrid-close-register-voter',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
    // hybrid
    // open vote
    {
      id: 'hybrid-open-vote',
      name: 'hybrid-open-vote',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -2),
      closeRegister: addDays(dateNow, -1),
      openVoting: dateNow,
      closeVoting: addDays(dateNow, 1),
      voters: {
        create: {
          id: 'hybrid-open-vote-voter-1',
          userId: userId,
          type: EligibleVoterType.ONLINE,
          bollot: {
            create: {
              id: 'hybrid-open-vote-voter-1-bollot',
              encryptedBallot: 'mock-encrypted-bollot',
              location: 'mock-location',
              faceImageURL: 'mock-faceImageURL',
            },
          },
        },
        createMany: {
          data: [
            {
              id: 'hybrid-open-vote-voter-2',
              userId: userId1,
              type: EligibleVoterType.ONLINE,
            },
            {
              id: 'hybrid-open-vote-voter-3',
              userId: userId2,
              type: EligibleVoterType.ONLINE,
            },
          ],
        },
      },
      candidates: {
        createMany: {
          data: [
            {
              id: 'candidate-1',
              name: 'candidate-1',
            },
            {
              id: 'candidate-2',
              name: 'candidate-2',
            },
            {
              id: 'candidate-3',
              name: 'candidate-3',
            },
          ],
        },
      },
    },
    // hybrid
    // closed vote
    {
      id: 'hybrid-close-vote',
      name: 'hybrid-close-vote',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -4),
      closeRegister: addDays(dateNow, -3),
      openVoting: addDays(dateNow, -2),
      closeVoting: addDays(dateNow, -1),
      voters: {
        create: {
          id: 'hybrid-close-vote-voter',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
    // hybrid
    // result announcement
    {
      id: 'hybrid-result-announcement',
      name: 'hybrid-result-announcement',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -4),
      closeRegister: addDays(dateNow, -3),
      openVoting: addDays(dateNow, -2),
      closeVoting: addDays(dateNow, -1),
      startResult: dateNow,
      endResult: addDays(dateNow, 1),
      voters: {
        create: {
          id: 'hybrid-result-annoucement',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
    // hybrid
    // close result announcement
    {
      id: 'hybrid-close-result-announcement',
      name: 'hybrid-close-result-announcement',
      type: ElectionType.HYBRID,
      openRegister: addDays(dateNow, -6),
      closeRegister: addDays(dateNow, -5),
      openVoting: addDays(dateNow, -4),
      closeVoting: addDays(dateNow, -3),
      startResult: addDays(dateNow, -2),
      endResult: addDays(dateNow, -1),
      voters: {
        create: {
          id: 'hybrid-close-result-announcement-voter',
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
  ] satisfies Prisma.ElectionCreateInput[]

  for (const election of elections) {
    const fromCreate = election.voters?.create.id
    const fromCreateMany = election.voters?.createMany?.data.map((voter) => voter.id) || []
    const voterIds = [fromCreate, ...fromCreateMany].filter((id) => id !== undefined)

    await prisma.$transaction(async (tx) => {
      await tx.electionEligibleBallot.deleteMany({
        where: {
          voterId: {
            in: voterIds,
          },
        },
      })

      await tx.electionEligibleVoter.deleteMany({
        where: {
          electionId: election.id,
        },
      })

      await tx.electionCandidate.deleteMany({
        where: {
          electionId: election.id,
        },
      })

      await tx.election.deleteMany({
        where: {
          id: election.id,
        },
      })

      await tx.election.create({ data: election })
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
