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

    const provinces = addresses.value.reduce((acc, { province }) => {
      if (!acc.includes(province)) acc.push(province)

      return acc
    }, [] as string[])

    return ok(provinces)
  }
}

export const AddressServicePlugin = new Elysia({ name: 'AddressService' })
  .use(AddressRepositoryPlugin)
  .decorate(({ addressRepository }) => ({
    addressService: new AddressService(addressRepository),
  }))
