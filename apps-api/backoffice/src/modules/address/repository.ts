import { PrismaService, PrismaServicePlugin } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { fromRepositoryPromise } from '../../utils/error'

export class AddressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getProvinces() {
    const provinces = await fromRepositoryPromise(
      this.prismaService.address.findMany({
        distinct: ['province'],
        select: { province: true },
        orderBy: { province: 'asc' },
      })
    )

    if (provinces.isErr()) {
      return err(provinces.error)
    }

    return ok(provinces.value.map((province) => province.province))
  }

  async getDistricts(filters?: { province?: string }) {
    const districts = await fromRepositoryPromise(
      this.prismaService.address.findMany({
        where: {
          province: filters?.province && { equals: filters.province },
        },
        distinct: ['district'],
        select: { district: true },
        orderBy: { district: 'asc' },
      })
    )

    if (districts.isErr()) {
      return err(districts.error)
    }

    return ok(districts.value.map(({ district }) => district))
  }

  async getSubDistricts(filters?: { province?: string; district?: string }) {
    const subDistricts = await fromRepositoryPromise(
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

    if (subDistricts.isErr()) {
      return err(subDistricts.error)
    }

    return ok(subDistricts.value.map(({ subDistrict }) => subDistrict))
  }

  async getPostalCodes(filters?: { province?: string; district?: string; subDistrict?: string }) {
    const postalCodes = await fromRepositoryPromise(
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

    if (postalCodes.isErr()) {
      return err(postalCodes.error)
    }

    return ok(postalCodes.value.map(({ postalCode }) => postalCode))
  }
}

export const AddressRepositoryPlugin = new Elysia({ name: 'AddressRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    addressRepository: new AddressRepository(prismaService),
  }))
