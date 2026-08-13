import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { isThaiMobileE164, normalizeThaiPhoneNumber } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

/**
 * The most people one call may name.
 *
 * A cap rather than pagination: a direct send exists so a per-person message
 * does not have to become a broadcast, and a caller needing thousands of
 * distinct recipients in one request is describing a broadcast. Exceeding it is
 * refused, never truncated — a silently shortened list is a message the caller
 * believes it sent.
 */
export const MAX_DIRECT_RECIPIENTS = 200

/** One recipient, named by the caller: `sub` or `phone`, exactly one of the two. */
export interface NamedRecipient {
  sub?: string
  phone?: string
}

/**
 * How a named entry is looked up, or `null` when it names nothing this platform
 * can look up at all — a phone that is not a whole Thai mobile number.
 *
 * `null` is deliberately not an error. An unparseable number is
 * indistinguishable from a number no account holds, and the whole point of the
 * collapsed `not_reachable` status is that they stay indistinguishable.
 */
export type RecipientLookup = { by: 'sub'; sub: string } | { by: 'phone'; phone: string } | null

/** A named entry paired with its lookup key, keeping the caller's own wording. */
export interface CanonicalRecipient {
  /** Echoed back verbatim in the response: who the caller said they meant. */
  named: NamedRecipient
  lookup: RecipientLookup
}

export type DirectRecipientStatus = 'delivered' | 'not_reachable'

export interface DirectSettlement {
  /** One result per entry, in the order named, echoing each entry as named. */
  results: { recipient: NamedRecipient; status: DirectRecipientStatus }[]
  /** Distinct people to actually create a notification for. */
  deliverTo: string[]
  /** What this call debits: the reach it requested, after de-duplication. */
  units: number
  /** The per-call audit record. Counts only — never who they were. */
  audit: { named: number; delivered: number; matchRatio: number }
}

const invalidRecipients = (message: string) =>
  err({ code: InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS, message })

/**
 * Turn the recipient list a caller named into lookup keys, refusing a list that
 * cannot be honoured as asked.
 *
 * Every refusal here is a refusal of the *whole call*. There is no partial
 * send, no truncation and no fallback to the app's broader audience: naming
 * recipients narrows a send, so a malformed list must never be able to widen
 * one — a message meant for one person turning into a message to everyone is
 * the failure this endpoint exists to make impossible.
 *
 * Phones are canonicalised to E.164 with Thailand as the default region, so
 * `0812345678` and `+66812345678` resolve to the same person.
 */
export const canonicalizeRecipients = (recipients: NamedRecipient[]) => {
  if (recipients.length === 0) {
    return invalidRecipients('A direct send must name at least one recipient.')
  }

  if (recipients.length > MAX_DIRECT_RECIPIENTS) {
    return invalidRecipients(
      `A direct send may name at most ${MAX_DIRECT_RECIPIENTS} recipients; this call named ${recipients.length}.`
    )
  }

  const canonical: CanonicalRecipient[] = []

  for (const named of recipients) {
    const sub = named.sub?.trim()
    const phone = named.phone?.trim()

    // Both, or neither. Picking a winner would be a rule nobody remembers while
    // debugging, and answering an entry that names two different people would
    // let a caller probe whether a sub and a phone belong to the same person.
    if ((sub ? 1 : 0) + (phone ? 1 : 0) !== 1) {
      return invalidRecipients(
        'Each recipient must name exactly one of `sub` or `phone`; neither and both are refused.'
      )
    }

    if (sub) {
      canonical.push({ named, lookup: { by: 'sub', sub } })
      continue
    }

    const e164 = normalizeThaiPhoneNumber(phone!)
    canonical.push({
      named,
      lookup: isThaiMobileE164(e164) ? { by: 'phone', phone: e164 } : null,
    })
  }

  return ok(canonical)
}

/** Every distinct E.164 number a canonical list needs resolved. */
export const phonesToResolve = (recipients: CanonicalRecipient[]): string[] =>
  Array.from(
    new Set(
      recipients.flatMap((recipient) =>
        recipient.lookup?.by === 'phone' ? [recipient.lookup.phone] : []
      )
    )
  )

/**
 * Decide who a direct send actually reaches, what it costs, and what to say
 * back about each entry.
 *
 * ## The one thing that must not leak
 *
 * `not_reachable` is a single collapsed status, and that is the feature rather
 * than a v1 shortcut. It covers *no PPLE ID account*, *an account that has
 * never opened this app*, and *someone outside the app's current tier
 * audience*, and it must not tell them apart — otherwise naming a phone number
 * becomes a directory lookup, and an app that cannot reach anyone new could
 * still learn who exists.
 *
 * That guarantee is structural here rather than a filter applied afterwards:
 * resolution happens *inside* the reachable set (`subByPhone` is built from the
 * app's own App Users), so an unreachable entry is never resolved to a person
 * at all. Nothing downstream holds a fact it would have to remember not to
 * disclose.
 *
 * The metering consequence, stated plainly: two entries naming the same
 * *unreachable* person cost two units rather than one, because from this
 * endpoint's vantage they resolved to nobody, twice — which is exactly what the
 * collapse means. De-duplication applies to people the app can actually reach.
 */
export const settleDirectDelivery = (
  recipients: CanonicalRecipient[],
  reach: {
    /** The app's App Users narrowed to its current tier — who it may reach. */
    reachable: ReadonlySet<string>
    /**
     * E.164 → sub, over the app's App Users. Narrower than the directory at
     * large, and narrowed again by `reachable` here: an App User who has since
     * fallen outside the tier (an invite withdrawn, an app pulled back to
     * Draft) resolves to nobody rather than to somebody filtered out later.
     */
    subByPhone: ReadonlyMap<string, string>
  }
): DirectSettlement => {
  // Both ways of naming a person end at the same question — is this someone the
  // app may reach? — so neither branch can answer it more generously.
  const resolve = (lookup: RecipientLookup): string | null => {
    if (lookup === null) return null
    const sub = lookup.by === 'sub' ? lookup.sub : reach.subByPhone.get(lookup.phone)

    return sub !== undefined && reach.reachable.has(sub) ? sub : null
  }

  const deliverTo = new Set<string>()
  let unresolved = 0

  const results = recipients.map((recipient) => {
    const sub = resolve(recipient.lookup)

    if (sub === null) {
      unresolved += 1
      return { recipient: recipient.named, status: 'not_reachable' as const }
    }

    deliverTo.add(sub)
    return { recipient: recipient.named, status: 'delivered' as const }
  })

  const delivered = deliverTo.size
  const named = recipients.length

  return {
    results,
    deliverTo: Array.from(deliverTo),
    // Distinct people reached, plus one for every entry that reached nobody.
    units: delivered + unresolved,
    audit: {
      named,
      delivered,
      // Rounded so a log line stays readable; `named` is never zero here,
      // because an empty list was refused before resolution.
      matchRatio: Math.round((delivered / named) * 10000) / 10000,
    },
  }
}
