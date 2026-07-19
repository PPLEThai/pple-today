import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'

/**
 * The identity behind a phone number, as the platform needs it: the PPLE ID
 * `sub` (this is `User.id` — the OIDC subject the auth guard resolves tokens
 * against) and the display name.
 */
export interface LookedUpUser {
  id: string
  name: string
}

/**
 * Reads a single identity by its whole phone number, for the platform's
 * Collaborator-by-phone flow.
 *
 * The one query here is a `findUnique` on the unique `phoneNumber` column, and
 * that is load-bearing rather than incidental: exact-match-or-nothing is the
 * privacy guarantee this module exists to keep (PPLEThai/pple-platform#40), so
 * there is deliberately no method that takes a fragment, and no `contains` /
 * `startsWith` anywhere in the class. Adding one would turn the platform's
 * confirmation step into a people search.
 *
 * `select` is narrowed to the two fields the platform is entitled to, so a later
 * column on `User` cannot widen this surface by accident.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class PlatformUserLookupRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByPhoneNumber(phoneNumber: string) {
    return await fromRepositoryPromise<LookedUpUser | null>(
      this.prismaService.user.findUnique({
        where: { phoneNumber },
        select: { id: true, name: true },
      })
    )
  }
}
