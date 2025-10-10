import * as Crypto from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'
import { AsyncBatcher } from '@tanstack/pacer'

import {
  AnnouncementStatus,
  HashTagStatus,
  PollStatus,
  PostStatus,
  Prisma,
  PrismaClient,
  TopicStatus,
} from '../../__generated__/prisma'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
})

const NUMBER_OF_USERS = 1000
const NUMBER_OF_AUTHORS = 500
const NUMBER_OF_HASHTAGS = 100
const NUMBER_OF_TOPICS = 50
const NUMBER_OF_FEED_ITEMS_PER_USER = 50
const NUMBER_OF_FOLLOWED_AUTHORS_PER_USER = 30
const NUMBER_OF_FOLLOWED_TOPICS_PER_USER = 20
const NUMBER_OF_REACTIONS_PER_USER = 30
const NUMBER_OF_COMMENTS_PER_USER = 20
const NUMBER_OF_HASHTAGS_PER_TOPIC = 50
const NUMBER_OF_HASHTAGS_PER_POST = 20
const NUMBER_OF_TOPICS_PER_FEED_ITEM = 20
const NUMBER_OF_FEED_ITEMS_WITH_REACTIONS = 300
const NUMBER_OF_FEED_ITEMS_WITH_COMMENTS = 300

const seedUsers = async () => {
  await prisma.user.createMany({
    data: [
      ...Array.from({ length: NUMBER_OF_USERS }).map((_, i) => ({
        id: `user-${i + 1}`,
        name: `user${i + 1}@example.com`,
        phoneNumber: Crypto.randomUUID().slice(0, 15),
      })),
      ...Array.from({ length: NUMBER_OF_AUTHORS }).map((_, i) => ({
        id: `author-${i + 1}`,
        name: `follower${i + 1}@example.com`,
        phoneNumber: Crypto.randomUUID().slice(0, 15),
      })),
      {
        id: `pple-official-user`,
        name: `pple-official-user@example.com`,
        phoneNumber: Crypto.randomUUID().slice(0, 15),
      },
    ],
    skipDuplicates: true,
  })

  console.log(`Seeded ${NUMBER_OF_USERS} users, ${NUMBER_OF_AUTHORS} authors and 1 official user`)
}

const seedHashTags = async () => {
  const data = []
  for (let i = 0; i < NUMBER_OF_HASHTAGS; i++) {
    data.push({
      id: `hashtag-${i + 1}`,
      name: `hashtag${i + 1}`,
      status: HashTagStatus.PUBLISHED,
    })
  }
  await prisma.hashTag.createMany({
    data,
    skipDuplicates: true,
  })

  console.log(`Seeded ${NUMBER_OF_HASHTAGS} hashtags`)
}

const seedTopics = async () => {
  const batcher = new AsyncBatcher<Prisma.TopicUpsertArgs>(
    async (items) => {
      const results = await Promise.all(items.map((item) => prisma.topic.upsert(item)))
      return results
    },
    {
      maxSize: 10,
    }
  )

  for (let i = 0; i < NUMBER_OF_TOPICS; i++) {
    batcher.addItem({
      where: {
        id: `topic-${i + 1}`,
      },
      update: {},
      create: {
        id: `topic-${i + 1}`,
        name: `topic${i + 1}`,
        description: `This is topic${i + 1} description`,
        hashTags: {
          create: Array.from({ length: NUMBER_OF_HASHTAGS_PER_TOPIC }).map((_, j) => ({
            hashTag: {
              connect: {
                id: `hashtag-${((i * NUMBER_OF_HASHTAGS_PER_TOPIC + j) % NUMBER_OF_HASHTAGS) + 1}`,
              },
            },
          })),
        },
        status: TopicStatus.PUBLISHED,
        bannerImagePath: '',
      },
    })
  }

  await batcher.flush()

  console.log(batcher.store.state.isEmpty) // true (batch was processed)

  console.log(
    `Seeded ${NUMBER_OF_TOPICS} topics with ${NUMBER_OF_HASHTAGS_PER_TOPIC} hashtags each`
  )
}

const seedUserFollowsUser = async () => {
  const userFollowsUserCreateArgs: Prisma.UserFollowsUserCreateManyInput[] = []

  for (let i = 0; i < NUMBER_OF_USERS; i++) {
    for (let j = 0; j < NUMBER_OF_FOLLOWED_AUTHORS_PER_USER; j++) {
      userFollowsUserCreateArgs.push({
        followerId: `user-${i + 1}`,
        followingId: `author-${((i + j) % NUMBER_OF_AUTHORS) + 1}`,
      })
    }
  }

  await prisma.userFollowsUser.createMany({
    data: userFollowsUserCreateArgs,
    skipDuplicates: true,
  })

  console.log(`Seeded user follows user relationships`)
}

const seedUserFollowsTopic = async () => {
  const createManyInput = {
    data: [] as Prisma.UserFollowsTopicCreateManyInput[],
    skipDuplicates: true,
  } satisfies Prisma.UserFollowsTopicCreateManyArgs

  for (let i = 0; i < NUMBER_OF_USERS; i++) {
    for (let j = 0; j < NUMBER_OF_FOLLOWED_TOPICS_PER_USER; j++) {
      createManyInput.data.push({
        userId: `user-${i + 1}`,
        topicId: `topic-${((i + j) % NUMBER_OF_TOPICS) + 1}`,
      })
    }
  }

  await prisma.userFollowsTopic.createMany(createManyInput)

  console.log(`Seeded user follows topic relationships`)
}

const seedFeedItems = async () => {
  let batchItem = [] as Prisma.FeedItemCreateArgs[]
  for (let i = 0; i < NUMBER_OF_AUTHORS; i++) {
    for (let j = 0; j < NUMBER_OF_FEED_ITEMS_PER_USER; j++) {
      switch (j) {
        case 0:
        case 1:
        case 2: {
          batchItem.push({
            data: {
              id: `feeditem-${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1}`,
              authorId: `author-${((i + j) % NUMBER_OF_AUTHORS) + 1}`,
              type: 'POST',
              publishedAt: new Date(),
              post: {
                create: {
                  facebookPostId: Crypto.randomUUID(),
                  content: `This is feed item ${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1} content`,
                  status: PostStatus.PUBLISHED,
                  hashTags: {
                    create: Array.from({ length: NUMBER_OF_HASHTAGS_PER_POST }).map((_, k) => ({
                      hashTag: {
                        connect: {
                          id: `hashtag-${((i * NUMBER_OF_HASHTAGS_PER_POST + k) % NUMBER_OF_HASHTAGS) + 1}`,
                        },
                      },
                    })),
                  },
                },
              },
            },
          })
          break
        }
        case 3: {
          batchItem.push({
            data: {
              id: `feeditem-${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1}`,
              authorId: `pple-official-user`,
              type: 'POLL',
              publishedAt: new Date(),
              poll: {
                create: {
                  type: 'SINGLE_CHOICE',
                  title: `This is feed item ${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1} title`,
                  description: `This is feed item ${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1} content`,
                  endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  status: PollStatus.PUBLISHED,
                  topics: {
                    create: Array.from({ length: NUMBER_OF_TOPICS_PER_FEED_ITEM }).map((_, k) => ({
                      topic: {
                        connect: {
                          id: `topic-${((i * NUMBER_OF_TOPICS_PER_FEED_ITEM + k) % NUMBER_OF_TOPICS) + 1}`,
                        },
                      },
                    })),
                  },
                },
              },
            },
          })
          break
        }
        default: {
          batchItem.push({
            data: {
              id: `feeditem-${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1}`,
              authorId: `pple-official-user`,
              type: 'ANNOUNCEMENT',
              publishedAt: new Date(),
              announcement: {
                create: {
                  type: 'OFFICIAL',
                  title: `This is feed item ${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1} title`,
                  content: `This is feed item ${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1} content`,
                  status: AnnouncementStatus.PUBLISHED,
                  topics: {
                    create: Array.from({ length: NUMBER_OF_TOPICS_PER_FEED_ITEM }).map((_, k) => ({
                      topic: {
                        connect: {
                          id: `topic-${((i * NUMBER_OF_TOPICS_PER_FEED_ITEM + k) % NUMBER_OF_TOPICS) + 1}`,
                        },
                      },
                    })),
                  },
                },
              },
            },
          })
          break
        }
      }

      if (batchItem.length >= 200) {
        await Promise.all(batchItem.map(async (item) => prisma.feedItem.create(item)))
        batchItem = []

        console.log(`Seeded feed item on ${i * NUMBER_OF_FEED_ITEMS_PER_USER + j + 1} feed items`)
      }
    }
  }

  if (batchItem.length > 0) {
    await Promise.all(batchItem.map(async (item) => prisma.feedItem.create(item)))
  }

  console.log(`Seeded ${NUMBER_OF_USERS * NUMBER_OF_FEED_ITEMS_PER_USER} feed items`)
}

const seedFeedItemReactions = async () => {
  const feedItemReactionInputs: Prisma.FeedItemReactionCreateManyInput[] = []
  const numberOfReactionsMapping = {} as Record<
    string,
    {
      UP_VOTE: number
      DOWN_VOTE: number
    }
  >

  for (let i = 0; i < NUMBER_OF_FEED_ITEMS_WITH_REACTIONS; i++) {
    for (let j = 0; j < NUMBER_OF_REACTIONS_PER_USER; j++) {
      feedItemReactionInputs.push({
        userId: `user-${((i + j) % NUMBER_OF_USERS) + 1}`,
        feedItemId: `feeditem-${i + 1}`,
        type: 'UP_VOTE',
      })
      numberOfReactionsMapping[`feeditem-${i + 1}`] = numberOfReactionsMapping[
        `feeditem-${i + 1}`
      ] || { UP_VOTE: 0, DOWN_VOTE: 0 }
      numberOfReactionsMapping[`feeditem-${i + 1}`].UP_VOTE++
    }
  }

  await prisma.feedItemReaction.createMany({
    data: feedItemReactionInputs,
    skipDuplicates: true,
  })

  await Promise.all(
    Object.entries(numberOfReactionsMapping).map(([feedItemId, reactionCounts]) =>
      prisma.feedItem.update({
        where: { id: feedItemId },
        data: {
          reactionCounts: {
            createMany: {
              data: [
                { type: 'UP_VOTE', count: reactionCounts.UP_VOTE },
                { type: 'DOWN_VOTE', count: reactionCounts.DOWN_VOTE },
              ],
              skipDuplicates: true,
            },
          },
        },
      })
    )
  )

  console.log(`Seeded reactions on ${NUMBER_OF_FEED_ITEMS_WITH_REACTIONS} feed items`)
}

const seedFeedItemComments = async () => {
  const feedItemCommentInputs: Prisma.FeedItemCommentCreateManyInput[] = []
  const numberOfCommentsMapping = {} as Record<string, number>
  for (let i = 0; i < NUMBER_OF_FEED_ITEMS_WITH_COMMENTS; i++) {
    for (let j = 0; j < NUMBER_OF_COMMENTS_PER_USER; j++) {
      feedItemCommentInputs.push({
        userId: `user-${((i + j) % NUMBER_OF_USERS) + 1}`,
        feedItemId: `feeditem-${i + 1}`,
        content: `This is comment ${j + 1} on feed item ${i + 1}`,
      })
      numberOfCommentsMapping[`feeditem-${i + 1}`] =
        (numberOfCommentsMapping[`feeditem-${i + 1}`] || 0) + 1
    }
  }

  await prisma.feedItemComment.createMany({
    data: feedItemCommentInputs,
    skipDuplicates: true,
  })
  await Promise.all(
    Object.entries(numberOfCommentsMapping).map(([feedItemId, numberOfComments]) =>
      prisma.feedItem.update({
        where: { id: feedItemId },
        data: { numberOfComments },
      })
    )
  )

  console.log(`Seeded comments on ${NUMBER_OF_FEED_ITEMS_WITH_COMMENTS} feed items`)
}

async function main() {
  await seedUsers()
  await seedHashTags()
  await seedTopics()
  await seedUserFollowsUser()
  await seedUserFollowsTopic()
  await seedFeedItems()
  await seedFeedItemReactions()
  await seedFeedItemComments()
}

main()
  .then(async () => {
    await prisma.$disconnect()
    return
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
