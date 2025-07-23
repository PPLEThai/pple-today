import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient, UserRole } from '../__generated__/prisma'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
})

const seedOfficialUser = async () => {
  await prisma.user.upsert({
    where: { id: 'official-user' },
    update: {
      name: 'Official User',
      phoneNumber: '+1234567890',
      role: UserRole.OFFICIAL,
    },
    create: {
      id: 'official-user',
      name: 'Official User',
      phoneNumber: '+1234567890',
      role: UserRole.OFFICIAL,
    },
  })
}

async function main() {
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
