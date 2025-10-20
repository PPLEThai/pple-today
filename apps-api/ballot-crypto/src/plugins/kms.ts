import { KeyManagementServiceClient } from '@google-cloud/kms'
import { google } from '@google-cloud/kms/build/protos/protos'
import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import crypto from 'crypto'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

import { fromGoogleAPIPromise, mapGoogleAPIError } from '../utils/error'

export class KeyManagementService {
  private readonly kmsClient: KeyManagementServiceClient
  private readonly DESTROY_SCHEDULED_DURATION = 30 * 24 * 60 * 60

  constructor(
    private readonly config: {
      projectId: string
      clientEmail: string
      privateKey: string
      location: string
      encryptionKeyRing: string
      signingKeyRing: string
    }
  ) {
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
    if (publicKeyResult.isErr()) return err(publicKeyResult.error)

    const [publicKey] = publicKeyResult.value

    return ok(publicKey.pem)
  }

  async getPublicKeyAsymmetricEncrypt(keyId: string) {
    const result = await this.getPublicKey(this.config.encryptionKeyRing, keyId)
    if (result.isErr()) return err(result.error)

    return ok(result.value as string) // publicKey of asymmetric always be string
  }

  async getPublicKeyAsymmetricSign(keyId: string) {
    const result = await this.getPublicKey(this.config.signingKeyRing, keyId)
    if (result.isErr()) return err(result.error)

    return ok(result.value as string) // publicKey of asymmetric always be string
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

  async createAsymmetricEncryptKey(keyId: string) {
    const key = {
      purpose: 'ASYMMETRIC_DECRYPT',
      destroyScheduledDuration: {
        seconds: this.DESTROY_SCHEDULED_DURATION,
      },
      versionTemplate: {
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256',
      },
    } satisfies google.cloud.kms.v1.ICryptoKey

    const createKeyResult = await this.createKey(this.config.encryptionKeyRing, keyId, key)
    if (createKeyResult.isErr()) return err(createKeyResult.error)

    return ok()
  }

  async createAsymmetricSignKey(keyId: string) {
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

  async destroyAsymmetricEncryptKey(keyId: string) {
    return this.destroyKey(this.config.encryptionKeyRing, keyId)
  }

  async destroyAsymmetricSignKey(keyId: string) {
    return this.destroyKey(this.config.signingKeyRing, keyId)
  }

  private async getCryptoKey(keyRing: string, keyId: string) {
    const version = this.kmsClient.cryptoKeyVersionPath(
      this.config.projectId,
      this.config.location,
      keyRing,
      keyId,
      '1'
    )

    return fromGoogleAPIPromise(this.kmsClient.getCryptoKeyVersion({ name: version }))
  }

  async checkIfKeysValid(electionId: string) {
    const keyResults = await Promise.all([
      this.getCryptoKey(this.config.encryptionKeyRing, electionId),
      this.getCryptoKey(this.config.signingKeyRing, electionId),
    ])

    const keyErr = keyResults.find((result) => result.isErr())

    if (keyErr) {
      return mapGoogleAPIError(keyErr.error, {
        NOT_FOUND: {
          code: InternalErrorCode.KEY_NOT_FOUND,
          message: `Cannot found key for election id ${electionId}`,
        },
      })
    }

    const states = keyResults
      .filter((result) => result.isOk())
      .map((result) => result.value[0].state)

    if (states.some((state) => state !== 'ENABLED')) {
      return err({
        code: InternalErrorCode.KEY_NOT_ENABLED,
        message: `Keys not enabled`,
      })
    }

    return ok()
  }

  async decryptCiphertext(keyId: string, ciphertext: string) {
    const version = this.kmsClient.cryptoKeyVersionPath(
      this.config.projectId,
      this.config.location,
      this.config.encryptionKeyRing,
      keyId,
      '1'
    )

    const decryptResult = await fromGoogleAPIPromise(
      this.kmsClient.asymmetricDecrypt({
        name: version,
        ciphertext: ciphertext,
      })
    )
    if (decryptResult.isErr()) return err(decryptResult.error)

    return ok(decryptResult.value[0].plaintext?.toString('utf-8') as string)
  }

  async createSignature(keyId: string, message: string) {
    const version = this.kmsClient.cryptoKeyVersionPath(
      this.config.projectId,
      this.config.location,
      this.config.signingKeyRing,
      keyId,
      '1'
    )

    const digest = crypto.createHash('sha256').update(message).digest()

    const signResult = await fromGoogleAPIPromise(
      this.kmsClient.asymmetricSign({
        name: version,
        digest: {
          sha256: digest,
        },
      })
    )
    if (signResult.isErr()) return err(signResult.error)

    return ok(signResult.value[0].signature?.toString('base64') as string)
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
