import { ok } from 'neverthrow'
import { mapRawPrismaError } from '../../utils/prisma'
import { AddressRepository, AddressRepositoryPlugin } from './repository'
import Elysia from 'elysia'

export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async getProvinces() {
    const addresses = await this.addressRepository.getAddresses()

    if (addresses.isErr()) {
      return mapRawPrismaError(addresses.error)
    }

    const provinceSet = new Set()
    const provinces: string[] = []

    addresses.value.forEach(({ province }) => {
      if (!provinces.includes(province)) {
        provinces.push(province)
        provinceSet.add(province)
      }
    })

    return ok(provinces)
  }

  async getDistricts(province?: string) {
    const addresses = await this.addressRepository.getAddresses(province)

    if (addresses.isErr()) {
      return mapRawPrismaError(addresses.error)
    }

    const districtSet = new Set()
    const districts: string[] = []

    addresses.value.forEach(({ district }) => {
      if (!districts.includes(district)) {
        districts.push(district)
        districtSet.add(district)
      }
    })

    return ok(districts)
  }
}

export const AddressServicePlugin = new Elysia({ name: 'AddressService' })
  .use(AddressRepositoryPlugin)
  .decorate(({ addressRepository }) => ({
    addressService: new AddressService(addressRepository),
  }))
