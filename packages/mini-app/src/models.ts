import z from 'zod'

export const IdTokenPayloadSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  azp: z.string().optional(),
  client_id: z.string().optional(),
  at_hash: z.string().optional(),
  sid: z.string().optional(),
})
export type IdTokenPayload = z.infer<typeof IdTokenPayloadSchema>

/**
 * The userinfo `kyc` block from PPLE ID. It says whether the person has proven
 * their identity, never who they are: the verified name and ID number only
 * reach the app's server through the PPLE Platform.
 */
export const KycSchema = z.object({
  status: z.enum(['none', 'pending_review', 'verified', 'rejected']),
  verified: z.boolean(),
  verifiedAt: z.string().nullable(),
  /** `membership` when party membership already proved the identity. */
  source: z.enum(['membership', 'kyc']).nullable(),
})
export type Kyc = z.infer<typeof KycSchema>

export const UserInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  updated_at: z.number().optional(),
  phone_number: z.string().optional(),
  phone_number_verified: z.boolean().optional(),
  // Absent from PPLE ID versions without KYC. A block this SDK cannot read (a
  // status added later) is dropped rather than failing the whole profile.
  kyc: KycSchema.optional().catch(undefined),
})
export type UserInfo = z.infer<typeof UserInfoSchema>

/** What PPLE ID appends to `return_to` when the user leaves `/kyc`. */
export const KycResultSchema = z.enum(['passed', 'pending_review', 'cancelled'])
export type KycResult = z.infer<typeof KycResultSchema>

export const AccessTokenDetailsSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.string(),
})
export type AccessTokenDetails = z.infer<typeof AccessTokenDetailsSchema>

export const BridgeSessionSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
})
export type BridgeSession = z.infer<typeof BridgeSessionSchema>

export const BridgeResponseSchema = z.discriminatedUnion('status', [
  z.object({
    type: z.literal('pple:session-response'),
    requestId: z.string(),
    status: z.literal('ok'),
    session: BridgeSessionSchema,
  }),
  z.object({
    type: z.literal('pple:session-response'),
    requestId: z.string(),
    status: z.literal('denied'),
    reason: z.string(),
  }),
])

export const RoleSwitchResponseSchema = z.discriminatedUnion('status', [
  z.object({
    type: z.literal('pple:role-switch-response'),
    requestId: z.string(),
    status: z.literal('switched'),
    activePersonId: z.number(),
    // Absent for apps that do not require authentication.
    session: BridgeSessionSchema.optional(),
  }),
  z.object({
    type: z.literal('pple:role-switch-response'),
    requestId: z.string(),
    status: z.enum(['unchanged', 'cancelled']),
  }),
  z.object({
    type: z.literal('pple:role-switch-response'),
    requestId: z.string(),
    status: z.literal('denied'),
    reason: z.string(),
  }),
])
export type RoleSwitchResponse = z.infer<typeof RoleSwitchResponseSchema>

// PPLE ID `GET /api/me` — only the fields the web role picker reads.
export const EligiblePersonSchema = z.object({
  id: z.number(),
  role: z.string(),
  role_label: z.string().nullish(),
  supervisor_full_name: z.string().nullish(),
  supervisor_role_label: z.string().nullish(),
})
export type EligiblePerson = z.infer<typeof EligiblePersonSchema>

export const SsoMeResponseSchema = z.object({
  data: z.object({
    active_pple_person_id: z.number().nullish(),
    approved_roles: z.array(EligiblePersonSchema).nullish(),
  }),
})
