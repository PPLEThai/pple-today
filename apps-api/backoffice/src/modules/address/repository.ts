import Elysia from 'elysia'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class AddressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAddresses() {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        orderBy: [
          { province: 'asc' },
          { district: 'asc' },
          { subDistrict: 'asc' },
          { postalCode: 'asc' },
        ],
      })
    )
  }
}

export const AddressRepositoryPlugin = new Elysia({ name: 'AddressRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    addressRepository: new AddressRepository(prismaService),
  }))
