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
      if (!provinceSet.has(province)) {
        provinces.push(province)
        provinceSet.add(province)
      }
    })

    provinces.sort()

    return ok(provinces)
  }

  async getDistricts(province?: string) {
    const addresses = await this.addressRepository.getAddresses({ province })
    if (addresses.isErr()) {
      return mapRawPrismaError(addresses.error)
    }

    const districtSet = new Set()
    const districts: string[] = []

    addresses.value.forEach(({ district }) => {
      if (!districtSet.has(district)) {
        districts.push(district)
        districtSet.add(district)
      }
    })

    districts.sort()

    return ok(districts)
  }

  async getSubDistricts(district?: string) {
    const addresses = await this.addressRepository.getAddresses({ district })

    if (addresses.isErr()) {
      return mapRawPrismaError(addresses.error)
    }

    const subDistrictSet = new Set()
    const subDistricts: string[] = []

    addresses.value.forEach(({ subDistrict }) => {
      if (!subDistrictSet.has(subDistrict)) {
        subDistricts.push(subDistrict)
        subDistrictSet.add(subDistrict)
      }
    })

    subDistricts.sort()

    return ok(subDistricts)
  }

  async getPostalCodes(subDistrict?: string) {
    const addresses = await this.addressRepository.getAddresses({ subDistrict })
    console.log('addresses', addresses)
    if (addresses.isErr()) {
      return mapRawPrismaError(addresses.error)
    }

    const postalCodeSet = new Set()
    const postalCodes: string[] = []

    addresses.value.forEach(({ postalCode }) => {
      if (!postalCodeSet.has(postalCode)) {
        postalCodes.push(postalCode)
        postalCodeSet.add(postalCode)
      }
    })

    return ok(postalCodes)
  }
}

export const AddressServicePlugin = new Elysia({ name: 'AddressService' })
  .use(AddressRepositoryPlugin)
  .decorate(({ addressRepository }) => ({
    addressService: new AddressService(addressRepository),
  }))
