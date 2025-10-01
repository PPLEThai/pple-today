import Elysia from 'elysia'

import { KeyManagementPlugin, KeyManagementService } from '../../plugins/kms'

export class KeyService {
  constructor(private keyManagementService: KeyManagementService) {}
}

export const KeyServicePlugin = new Elysia()
  .use(KeyManagementPlugin)
  .decorate(({ keyManagementService }) => ({
    keyService: new KeyService(keyManagementService),
  }))
