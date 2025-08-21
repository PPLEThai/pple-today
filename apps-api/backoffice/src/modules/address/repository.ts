import Elysia from 'elysia'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class AddressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAddresses(options?: { province?: string; district?: string }) {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        where: {
          province: options?.province === undefined ? {} : { equals: options.province },
          district: options?.district === undefined ? {} : { equals: options.district },
        },
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
