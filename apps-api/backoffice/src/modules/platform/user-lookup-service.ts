import { InternalErrorCode } from '@pple-today/api-common/dtos'
import {
  err,
  isThaiMobileE164,
  mapRepositoryError,
  normalizeThaiPhoneNumber,
} from '@pple-today/api-common/utils'
import { ok } from 'neverthrow'

import type { PlatformUserLookupRepository } from './user-lookup-repository'

/**
 * Resolves a complete mobile number to a PPLE identity, so the platform can ask
 * an Owner to confirm a masked name before granting Collaborator access keyed by
 * `sub` (PPLEThai/pple-platform#35).
 *
 * This is the narrowest useful shape of "who is this number", and the narrowness
 * is the point. Two rules hold it there:
 *
 * 1. **Whole numbers only.** An incomplete number is rejected here, before the
 *    repository is consulted — a prefix must never behave like a search.
 * 2. **Miss and malformed are the same answer.** Both come back as
 *    `USER_NOT_FOUND`. Distinguishing them would let a caller learn which of its
 *    guesses were well-formed and probe the difference, and the caller has no
 *    use for the distinction: the platform already validated the number its
 *    Owner typed.
 *
 * Returning the *full* `name` is intentional. Masking lives in pple-platform,
 * which shows the Owner something like "ส. ใจดี" and never the whole name; this
 * service is not the place to guess at that presentation.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class PlatformUserLookupService {
  constructor(private readonly userLookupRepository: PlatformUserLookupRepository) {}

  async lookupByPhoneNumber(rawPhoneNumber: string) {
    const phoneNumber = normalizeThaiPhoneNumber(rawPhoneNumber)

    if (!isThaiMobileE164(phoneNumber)) {
      return this.notFound()
    }

    const result = await this.userLookupRepository.findByPhoneNumber(phoneNumber)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    if (!result.value) {
      return this.notFound()
    }

    return ok({ sub: result.value.id, name: result.value.name })
  }

  /**
   * The single not-found answer. The message deliberately omits the number that
   * was looked up: it would otherwise land in logs and error bodies for every
   * miss, scattering copies of a phone number that turned out to belong to
   * nobody the caller is entitled to know about.
   */
  private notFound() {
    return err({
      code: InternalErrorCode.USER_NOT_FOUND,
      message: 'No account holds that phone number',
    })
  }
}
