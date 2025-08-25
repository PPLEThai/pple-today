import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AddressRepository, AddressRepositoryPlugin } from './repository'

import { mapRepositoryError } from '../../utils/error'

export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async getProvinces() {
    const provinces = await this.addressRepository.getProvinces()

    if (provinces.isErr()) {
      return mapRepositoryError(provinces.error)
    }

    return ok(provinces.value)
  }

  async getDistricts(filters?: { province?: string }) {
    const distincts = await this.addressRepository.getDistricts({
      province: filters?.province,
    })

    if (distincts.isErr()) {
      return mapRepositoryError(distincts.error)
    }

    return ok(distincts.value)
  }

  async getSubDistricts(filters?: { province?: string; district?: string }) {
    const subDistricts = await this.addressRepository.getSubDistricts({
      province: filters?.province,
      district: filters?.district,
    })

    if (subDistricts.isErr()) {
      return mapRepositoryError(subDistricts.error)
    }

    return ok(subDistricts.value)
  }

  async getPostalCodes(filters?: { province?: string; district?: string; subDistrict?: string }) {
    const postalCodes = await this.addressRepository.getPostalCodes({
      province: filters?.province,
      district: filters?.district,
      subDistrict: filters?.subDistrict,
    })

    if (postalCodes.isErr()) {
      return mapRepositoryError(postalCodes.error)
    }

    return ok(postalCodes.value)
  }
}

export const AddressServicePlugin = new Elysia({ name: 'AddressService' })
  .use(AddressRepositoryPlugin)
  .decorate(({ addressRepository }) => ({
    addressService: new AddressService(addressRepository),
  }))
