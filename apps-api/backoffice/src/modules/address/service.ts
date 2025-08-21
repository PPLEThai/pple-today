import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AddressRepository, AddressRepositoryPlugin } from './repository'

import { mapRawPrismaError } from '../../utils/prisma'

export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async getProvinces() {
    const provinces = await this.addressRepository.getProvinces()

    if (provinces.isErr()) {
      return mapRawPrismaError(provinces.error)
    }

    return ok(provinces.value.map(({ province }) => province))
  }

  async getDistricts(filters?: { province?: string }) {
    const distincts = await this.addressRepository.getDistricts({
      province: filters?.province,
    })

    if (distincts.isErr()) {
      return mapRawPrismaError(distincts.error)
    }

    return ok(distincts.value.map(({ district }) => district))
  }

  async getSubDistricts(filters?: { province?: string; district?: string }) {
    const subDistricts = await this.addressRepository.getSubDistricts({
      province: filters?.province,
      district: filters?.district,
    })

    if (subDistricts.isErr()) {
      return mapRawPrismaError(subDistricts.error)
    }

    return ok(subDistricts.value.map(({ subDistrict }) => subDistrict))
  }

  async getPostalCodes(filters?: { province?: string; district?: string; subDistrict?: string }) {
    const postalCodes = await this.addressRepository.getPostalCodes({
      province: filters?.province,
      district: filters?.district,
      subDistrict: filters?.subDistrict,
    })

    if (postalCodes.isErr()) {
      return mapRawPrismaError(postalCodes.error)
    }

    return ok(postalCodes.value.map(({ postalCode }) => postalCode))
  }
}

export const AddressServicePlugin = new Elysia({ name: 'AddressService' })
  .use(AddressRepositoryPlugin)
  .decorate(({ addressRepository }) => ({
    addressService: new AddressService(addressRepository),
  }))
