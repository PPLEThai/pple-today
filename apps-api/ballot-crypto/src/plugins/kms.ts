import { KeyManagementServiceClient } from '@google-cloud/kms'
import { google } from '@google-cloud/kms/build/protos/protos'
import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import { err } from '@pple-today/api-common/utils'
import crypto from 'crypto'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

import { fromGoogleAPIPromise, mapGoogleAPIError } from '../utils/error'

export class KeyManagementService {
  private readonly kmsClient: KeyManagementServiceClient
  private readonly DESTROY_SCHEDULED_DURATION = 3 * 30 * 24 * 60 * 60

  constructor(
    private readonly config: {
      projectId: string
      clientEmail: string
      privateKey: string
      location: string
      encryptionKeyRing: string
      signingKeyRing: string
    },
    private readonly loggerService: ElysiaLoggerInstance
  ) {
    this.kmsClient = new KeyManagementServiceClient({
      credentials: {
        projectId: config.projectId,
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
    })
  }

  private log(options: {
    keyRing: string
    keyId: string
    action: 'CREATE' | 'DESTROY'
    status: 'FAILED' | 'SUCCESS'
  }) {
    const data = {
      status: options.status,
      action: options.action,
      keyRing: options.keyRing,
      keyId: options.keyId,
      location: this.config.location,
    }
    const message = `${options.action} key '${options.keyId}' in key ring '${options.keyRing}' - ${options.status}`

    if (options.status === 'FAILED') {
      this.loggerService.error(data, message)
    } else {
      this.loggerService.info(data, message)
    }
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

    const result = await fromGoogleAPIPromise(
      this.kmsClient.createCryptoKey({
        cryptoKey: key,
        parent: keyRingName,
        cryptoKeyId: keyId,
      })
    )
    if (result.isErr()) {
      this.log({
        keyRing,
        keyId,
        action: 'CREATE',
        status: 'FAILED',
      })

      return err(result.error)
    }

    this.log({
      keyRing,
      keyId,
      action: 'CREATE',
      status: 'SUCCESS',
    })

    return ok()
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

    const result = await fromGoogleAPIPromise(
      this.kmsClient.destroyCryptoKeyVersion({ name: version })
    )
    if (result.isErr()) {
      this.log({
        keyRing,
        keyId,
        action: 'DESTROY',
        status: 'FAILED',
      })

      return err(result.error)
    }

    this.log({
      keyRing,
      keyId,
      action: 'DESTROY',
      status: 'SUCCESS',
    })

    return ok()
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
          code: InternalErrorCode.ELECTION_KEY_NOT_FOUND,
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
  .use(
    ElysiaLoggerPlugin({
      name: 'KeyManagementService',
    })
  )
  .decorate(({ configService, loggerService }) => ({
    keyManagementService: new KeyManagementService(
      {
        clientEmail: configService.get('GCP_CLIENT_EMAIL'),
        privateKey: configService.get('GCP_PRIVATE_KEY'),
        projectId: configService.get('GCP_PROJECT_ID'),
        location: configService.get('GCP_LOCATION'),
        encryptionKeyRing: configService.get('GCP_ENCRYPTION_KEY_RING'),
        signingKeyRing: configService.get('GCP_SIGNING_KEY_RING'),
      },
      loggerService
    ),
  }))
