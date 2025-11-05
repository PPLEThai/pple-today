import { PrismaPg } from '@prisma/adapter-pg'

import {
  ElectionKeysStatus,
  ElectionType,
  EligibleVoterType,
  Prisma,
  PrismaClient,
} from '../../__generated__/prisma'

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
    // online
    // key pending
    {
      id: 'online-with-key-pending',
      name: 'online-with-key-pending',
      type: ElectionType.ONLINE,
      keysStatus: ElectionKeysStatus.PENDING_CREATED,
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
    },
    // online
    // key failed
    {
      id: 'online-with-key-failed',
      name: 'online-with-key-failed',
      type: ElectionType.ONLINE,
      keysStatus: ElectionKeysStatus.FAILED_CREATED,
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
    },
    // online
    // key success
    {
      id: 'online-with-key-success',
      name: 'online-with-key-success',
      type: ElectionType.ONLINE,
      keysStatus: ElectionKeysStatus.CREATED,
      encryptionPublicKey: 'mock',
      signingPublicKey: 'mock',
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
    },
    // onsite
    // not publish
    {
      id: 'onsite-not-publish',
      name: 'onsite-not-publish',
      type: ElectionType.ONSITE,
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      openVoting: addDays(dateNow, 2),
      closeVoting: addDays(dateNow, 3),
      voters: {
        create: {
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
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
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
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      publishDate: dateNow,
      openRegister: addDays(dateNow, 1),
      closeRegister: addDays(dateNow, 2),
      openVoting: addDays(dateNow, 3),
      closeVoting: addDays(dateNow, 4),
      voters: {
        create: {
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
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      publishDate: dateNow,
      openRegister: dateNow,
      closeRegister: addDays(dateNow, 1),
      openVoting: addDays(dateNow, 2),
      closeVoting: addDays(dateNow, 3),
      voters: {
        create: {
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
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      publishDate: dateNow,
      openRegister: addDays(dateNow, -3),
      closeRegister: addDays(dateNow, -2),
      openVoting: addDays(dateNow, 1),
      closeVoting: addDays(dateNow, 2),
      voters: {
        create: {
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
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      encryptionPublicKey: `
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAujb1XP88zHImW8EUO82h
      ChtCeSpVAvboaukDmmZe/MqJVLrFP3APdncE0v015aS2W47AWZo+HOw04pG6lrku
      VLVz4eh3dwphetzfddSj9mMHI6yPzQnzXvwnFP7loqoY25lw3lLpIhGoB19M+DgW
      rnik4JKEAeB+XeqFG9apJ5+1tqeT35sW5KkS4Rvv7Y5xDn/S8FtNTnLQaUUcw2Jg
      8aUz4GPOdGpbZpwyZYPU4KgU+akxJP/A1OPZv/Hx4MOCFdBkdgEJdr2J8zCqGpAg
      aIrbvHKvFFf/CjGZ2AXFQ3FQYbjfYlCiYDMcnmb+EEo+XrPNvcPMp1cHHh4ooqQi
      UQIDAQAB
      -----END PUBLIC KEY-----
      `,
      publishDate: dateNow,
      openRegister: addDays(dateNow, -2),
      closeRegister: addDays(dateNow, -1),
      openVoting: dateNow,
      closeVoting: addDays(dateNow, 1),
      voters: {
        create: {
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
        createMany: {
          data: [
            {
              userId: userId1,
              type: EligibleVoterType.ONLINE,
            },
            {
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
              number: 1,
            },
            {
              id: 'candidate-2',
              name: 'candidate-2',
              number: 2,
            },
            {
              id: 'candidate-3',
              name: 'candidate-3',
              number: 3,
            },
          ],
        },
      },
      ballots: {
        create: {
          id: 'my-bollot',
          encryptedBallot: 'Pickachu',
          voteRecord: {
            create: {
              userId,
              electionId: 'hybrid-open-vote',
            },
          },
        },
      },
    },
    // hybrid
    // closed vote
    {
      id: 'hybrid-close-vote',
      name: 'hybrid-close-vote',
      type: ElectionType.HYBRID,
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      publishDate: dateNow,
      openRegister: addDays(dateNow, -4),
      closeRegister: addDays(dateNow, -3),
      openVoting: addDays(dateNow, -2),
      closeVoting: addDays(dateNow, -1),
      voters: {
        createMany: {
          data: [
            {
              userId: userId,
              type: EligibleVoterType.ONLINE,
            },
            {
              userId: 'election-user-1',
              type: EligibleVoterType.ONSITE,
            },
            {
              userId: 'election-user-2',
              type: EligibleVoterType.ONLINE,
            },
          ],
        },
      },
      candidates: {
        createMany: {
          data: [
            {
              id: 'close-vote-1',
              name: 'close-vote-1',
              number: 1,
            },
            {
              id: 'close-vote-2',
              name: 'close-vote-2',
              number: 2,
            },
            {
              id: 'close-vote-3',
              name: 'close-vote-3',
              number: 3,
            },
          ],
        },
      },
    },
    // hybrid
    // result announcement
    {
      id: 'hybrid-result-announcement',
      name: 'hybrid-result-announcement',
      type: ElectionType.HYBRID,
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      publishDate: addDays(dateNow, -4),
      openRegister: addDays(dateNow, -4),
      closeRegister: addDays(dateNow, -3),
      openVoting: addDays(dateNow, -2),
      closeVoting: addDays(dateNow, -1),
      startResult: dateNow,
      endResult: addDays(dateNow, 1),
      voters: {
        create: {
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
      candidates: {
        createMany: {
          data: [
            {
              id: 'candidate-11',
              name: 'candidate-11',
              number: 11,
            },
            {
              id: 'candidate-12',
              name: 'candidate-12',
              number: 12,
            },
            {
              id: 'candidate-13',
              name: 'candidate-13',
              number: 13,
            },
          ],
        },
      },
    },
    // hybrid
    // close result announcement
    {
      id: 'hybrid-close-result-announcement',
      name: 'hybrid-close-result-announcement',
      type: ElectionType.HYBRID,
      location: 'กรุงเทพมหานคร ประเทศไทย',
      locationMapUrl: 'https://maps.google.com/?q=Bangkok,Thailand',
      province: 'กรุงเทพมหานคร',
      district: 'บางรัก',
      publishDate: addDays(dateNow, -6),
      openRegister: addDays(dateNow, -6),
      closeRegister: addDays(dateNow, -5),
      openVoting: addDays(dateNow, -4),
      closeVoting: addDays(dateNow, -3),
      startResult: addDays(dateNow, -2),
      endResult: addDays(dateNow, -1),
      voters: {
        create: {
          userId: userId,
          type: EligibleVoterType.ONLINE,
        },
      },
    },
  ] satisfies Prisma.ElectionCreateInput[]

  await prisma.$transaction(async (tx) => {
    const userIds = [userId1, userId2]
    for (const userId of userIds) {
      await prisma.user.upsert({
        where: {
          id: userId,
        },
        create: {
          id: userId,
          name: userId,
          phoneNumber: userId,
        },
        update: {},
      })
    }

    for (const election of elections) {
      await tx.electionBallot.deleteMany({
        where: {
          electionId: election.id,
        },
      })

      await tx.electionVoteRecord.deleteMany({
        where: {
          electionId: election.id,
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
    }
  })
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
