import Elysia from 'elysia'

import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class AddressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getProvinces() {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        distinct: ['province'],
        select: { province: true },
        orderBy: { province: 'asc' },
      })
    )
  }

  async getDistricts(filters?: { province?: string }) {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        where: {
          province: filters?.province && { equals: filters.province },
        },
        distinct: ['district'],
        select: { district: true },
        orderBy: { district: 'asc' },
      })
    )
  }

  async getSubDistricts(filters?: { province?: string; district?: string }) {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        where: {
          province: filters?.province && { equals: filters.province },
          district: filters?.district && { equals: filters.district },
        },
        distinct: ['subDistrict'],
        select: { subDistrict: true },
        orderBy: { subDistrict: 'asc' },
      })
    )
  }

  async getPostalCodes(filters?: { province?: string; district?: string; subDistrict?: string }) {
    return fromPrismaPromise(
      this.prismaService.address.findMany({
        where: {
          province: filters?.province && { equals: filters.province },
          district: filters?.district && { equals: filters.district },
          subDistrict: filters?.subDistrict && { equals: filters.subDistrict },
        },
        distinct: ['postalCode'],
        select: { postalCode: true },
        orderBy: { postalCode: 'asc' },
      })
    )
  }
}

export const AddressRepositoryPlugin = new Elysia({ name: 'AddressRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    addressRepository: new AddressRepository(prismaService),
  }))
