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

export const UserInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  updated_at: z.number().optional(),
  phone_number: z.string().optional(),
  phone_number_verified: z.boolean().optional(),
})
export type UserInfo = z.infer<typeof UserInfoSchema>

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
