import { KeyManagementServiceClient } from '@google-cloud/kms'
import { google } from '@google-cloud/kms/build/protos/protos'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

export type KeyManagementServiceConfig = {
  projectId: string
  clientEmail: string
  privateKey: string
  location: string
  keyRing: string
}

export class KeyManagementService {
  private kmsClient: KeyManagementServiceClient

  constructor(private config: KeyManagementServiceConfig) {
    this.kmsClient = new KeyManagementServiceClient({
      credentials: {
        projectId: config.projectId,
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
    })
  }

  async getPublicKey(keyId: string) {
    const name = this.kmsClient.cryptoKeyVersionPath(
      this.config.projectId,
      this.config.location,
      this.config.keyRing,
      keyId,
      '1'
    )

    const publicKeyResult = await fromRepositoryPromise(this.kmsClient.getPublicKey({ name }))
    if (publicKeyResult.isErr()) {
      console.log(publicKeyResult.error)
      return err(publicKeyResult.error)
    }

    const [publicKey] = publicKeyResult.value

    return ok(publicKey.pem as string) // it must alway be a string
  }

  async createKey(keyId: string) {
    const keyRingName = this.kmsClient.keyRingPath(
      this.config.projectId,
      this.config.location,
      this.config.keyRing
    )

    const key = {
      purpose: 'ASYMMETRIC_DECRYPT',
      versionTemplate: {
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256',
      },
    } satisfies google.cloud.kms.v1.ICryptoKey

    const createKeyResult = await fromRepositoryPromise(
      this.kmsClient.createCryptoKey({
        cryptoKey: key,
        parent: keyRingName,
        cryptoKeyId: keyId,
      })
    )
    if (createKeyResult.isErr()) {
      return err(createKeyResult.error)
    }

    return ok()
  }
}

export const KeyManagementPlugin = new Elysia({ name: 'KeyManagementService' })
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    keyManagementService: new KeyManagementService({
      clientEmail: configService.get('GCP_CLIENT_EMAIL'),
      privateKey: configService.get('GCP_PRIVATE_KEY'),
      projectId: configService.get('GCP_PROJECT_ID'),
      location: configService.get('GCP_LOCATION'),
      keyRing: configService.get('GCP_KEY_RING'),
    }),
  }))
