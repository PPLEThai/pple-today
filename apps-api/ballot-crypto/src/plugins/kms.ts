import { KeyManagementServiceClient } from '@google-cloud/kms'
import { google } from '@google-cloud/kms/build/protos/protos'
import { err } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

import { fromGoogleAPIPromise } from '../utils/error'

export type KeyManagementServiceConfig = {
  projectId: string
  clientEmail: string
  privateKey: string
  location: string
  encryptionKeyRing: string
  signingKeyRing: string
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

  private async getPublicKey(keyRing: string, keyId: string) {
    const name = this.kmsClient.cryptoKeyVersionPath(
      this.config.projectId,
      this.config.location,
      keyRing,
      keyId,
      '1'
    )

    const publicKeyResult = await fromGoogleAPIPromise(this.kmsClient.getPublicKey({ name }))
    if (publicKeyResult.isErr()) {
      return err(publicKeyResult.error)
    }

    const [publicKey] = publicKeyResult.value

    return ok(publicKey.pem)
  }

  async getPublicKeyAsymmetricDecrypt(keyId: string) {
    const result = await this.getPublicKey(this.config.encryptionKeyRing, keyId)
    if (result.isErr()) return err(result.error)

    return ok(result.value as string) // publicKey of asymmetric must be string
  }

  async getPublicKeyAsymmetricSign(keyId: string) {
    const result = await this.getPublicKey(this.config.signingKeyRing, keyId)
    if (result.isErr()) return err(result.error)

    return ok(result.value as string) // publicKey of asymmetric must be string
  }

  private async createKey(keyRing: string, keyId: string, key: google.cloud.kms.v1.ICryptoKey) {
    const keyRingName = this.kmsClient.keyRingPath(
      this.config.projectId,
      this.config.location,
      keyRing
    )

    return fromGoogleAPIPromise(
      this.kmsClient.createCryptoKey({
        cryptoKey: key,
        parent: keyRingName,
        cryptoKeyId: keyId,
      })
    )
  }

  async createKeyAsymmetricDecrypt(keyId: string) {
    const key = {
      purpose: 'ASYMMETRIC_DECRYPT',
      versionTemplate: {
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256',
      },
    } satisfies google.cloud.kms.v1.ICryptoKey

    const createKeyResult = await this.createKey(this.config.encryptionKeyRing, keyId, key)
    if (createKeyResult.isErr()) return err(createKeyResult.error)

    return ok()
  }

  async createKeyAsymmetricSign(keyId: string) {
    const key = {
      purpose: 'ASYMMETRIC_SIGN',
      versionTemplate: {
        algorithm: 'EC_SIGN_P256_SHA256',
      },
    } satisfies google.cloud.kms.v1.ICryptoKey

    const createKeyResult = await this.createKey(this.config.signingKeyRing, keyId, key)
    if (createKeyResult.isErr()) return err(createKeyResult.error)

    return ok()
  }

  private async destroyKey(keyRing: string, keyId: string) {
    const version = this.kmsClient.cryptoKeyVersionPath(
      this.config.projectId,
      this.config.location,
      keyRing,
      keyId,
      '1'
    )

    return fromGoogleAPIPromise(this.kmsClient.destroyCryptoKeyVersion({ name: version }))
  }

  async destroyKeyAsymmetricDecrypt(keyId: string) {
    return this.destroyKey(this.config.encryptionKeyRing, keyId)
  }

  async destroyKeyAsymmetricSign(keyId: string) {
    return this.destroyKey(this.config.signingKeyRing, keyId)
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
      encryptionKeyRing: configService.get('GCP_ENCRYPTION_KEY_RING'),
      signingKeyRing: configService.get('GCP_SIGNING_KEY_RING'),
    }),
  }))
