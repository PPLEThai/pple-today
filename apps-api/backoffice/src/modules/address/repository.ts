import Elysia from 'elysia'

import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class AddressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAddresses(filters?: { province?: string; district?: string; subDistrict?: string }) {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        where: {
          province: filters?.province && { equals: filters.province },
          district: filters?.district && { equals: filters.district },
          subDistrict: filters?.subDistrict && { equals: filters.subDistrict },
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
