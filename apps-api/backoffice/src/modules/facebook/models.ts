import { Static, t } from 'elysia'

export const GetLinkedFacebookPageResponse = t.Object({
  linkedFacebookPage: t.Nullable(
    t.Object({
      id: t.String({
        description: 'The ID of the linked Facebook page',
      }),
      name: t.String({
        description: 'The name of the linked Facebook page',
      }),
      profilePictureUrl: t.String({
        description: 'The URL of the profile picture for the linked Facebook page',
        format: 'uri',
      }),
    })
  ),
})
export type GetLinkedFacebookPageResponse = Static<typeof GetLinkedFacebookPageResponse>

export const LinkFacebookPageToUserBody = t.Object({
  facebookPageId: t.String({
    description: 'The ID of the Facebook page to link to the user',
  }),
  facebookPageAccessToken: t.String({
    description: 'The access token for the Facebook page',
  }),
})
export type LinkFacebookPageToUserBody = Static<typeof LinkFacebookPageToUserBody>

export const LinkFacebookPageToUserResponse = t.Object({
  message: t.String({
    description: 'Success message indicating the Facebook page was linked successfully',
  }),
})
export type LinkFacebookPageToUserResponse = Static<typeof LinkFacebookPageToUserResponse>

export const UnlinkPageResponse = t.Object({
  message: t.String({
    description: 'Success message indicating the Facebook page was unlinked successfully',
  }),
})
export type UnlinkPageResponse = Static<typeof UnlinkPageResponse>
