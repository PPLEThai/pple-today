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
export type IdTokenPayloadSchema = z.infer<typeof IdTokenPayloadSchema>

export const UserInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  updated_at: z.number().optional(),
  phone_number: z.string().optional(),
  phone_number_verified: z.boolean().optional(),
})
export type UserInfoSchema = z.infer<typeof UserInfoSchema>

export const AccessTokenDetailsSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.string(),
})
export type AccessTokenDetailsSchema = z.infer<typeof AccessTokenDetailsSchema>
