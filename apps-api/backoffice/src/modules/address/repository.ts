import Elysia from 'elysia'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class AddressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAddresses(filter?: { province?: string; district?: string; subDistrict?: string }) {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        where: {
          province: filter?.province === undefined ? {} : { equals: filter.province },
          district: filter?.district === undefined ? {} : { equals: filter.district },
          subDistrict: filter?.subDistrict === undefined ? {} : { equals: filter.subDistrict },
        },
      })
    )
  }
}

export const AddressRepositoryPlugin = new Elysia({ name: 'AddressRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    addressRepository: new AddressRepository(prismaService),
  }))
