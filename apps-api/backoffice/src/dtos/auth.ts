import { Static, t } from 'elysia'

export const IntrospectAccessTokenResult = t.Union([
  t.Object({
    active: t.Literal(true, { description: 'Indicates if the token is active' }),
    scope: t.String({ description: 'Scopes associated with the token' }),
    client_id: t.String({ description: 'Client ID of the application' }),
    token_type: t.String({ description: 'Type of the token, e.g., Bearer' }),
    exp: t.Number({ description: 'Expiration time of the token in seconds since epoch' }),
    iat: t.Number({ description: 'Issued at time of the token in seconds since epoch' }),
    nbf: t.Number({ description: 'Not before time of the token in seconds since epoch' }),
    sub: t.String({ description: 'Subject identifier for the user' }),
    aud: t.Array(t.String(), { description: 'Audience for which the token is intended' }),
    iss: t.String({ description: 'Issuer of the token' }),
    jti: t.String({ description: 'JWT ID, a unique identifier for the token' }),
    username: t.String({ description: 'Username of the authenticated user' }),
    name: t.String({ description: 'Full name of the user' }),
    given_name: t.String({ description: 'Given name of the user' }),
    family_name: t.String({ description: 'Family name of the user' }),
    locale: t.Nullable(t.String({ description: 'Locale of the user, if available' })),
    updated_at: t.Number({ description: 'Last updated time of the user in seconds since epoch' }),
    preferred_username: t.String({ description: 'Preferred username of the user' }),
    email: t.Optional(t.String({ description: 'Email address of the user' })),
    email_verified: t.Optional(t.Boolean({ description: 'Indicates if the email is verified' })),
    phone_number: t.String({ description: 'Phone number of the user' }),
    phone_number_verified: t.Boolean({ description: 'Indicates if the phone number' }),
  }),
  t.Object({
    active: t.Literal(false, { description: 'Indicates if the token is active' }),
  }),
])

export type IntrospectAccessTokenResult = Static<typeof IntrospectAccessTokenResult>
