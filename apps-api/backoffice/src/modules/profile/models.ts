import { Static, t } from 'elysia'

import { UserRole } from '../../../__generated__/prisma'

export const GetMyProfileResponse = t.Object({
  id: t.String({ description: 'The ID of the user' }),
  name: t.String({ description: 'The name of the user' }),
  profileImage: t.Optional(t.String({ description: 'The URL of the profile image' })),
  birthDate: t.Optional(t.String({ description: 'The birth date of the user' })),
  role: t.Enum(UserRole, { description: 'The role of the user' }),
  numberOfFollowing: t.Number({ description: 'Number of users the user is following' }),
  point: t.Number({ description: 'Points earned by the user' }),
  numberOfFollowingTopics: t.Number({ description: 'Number of topics the user is following' }),
  address: t.Optional(
    t.Object({
      province: t.String({ description: "Province or state of the user's address" }),
      district: t.String({ description: "District or city of the user's address" }),
      subDistrict: t.String({ description: "Sub-district of the user's address" }),
    })
  ),
})

export type GetMyProfileResponse = Static<typeof GetMyProfileResponse>

export const GetProfileByIdParams = t.Object({
  id: t.String({ description: 'The ID of the user' }),
})

export const GetProfileByIdResponse = t.Object({
  id: t.String({ description: 'The ID of the user' }),
  role: t.Enum(UserRole, { description: 'The role of the user' }),
  name: t.String({ description: 'The name of the user' }),
  profileImage: t.Optional(t.String({ description: 'The URL of the profile image' })),
  birthDate: t.Optional(t.String({ description: 'The birth date of the user' })),
  numberOfFollowers: t.Number({ description: 'Number of followers the user has' }),
  address: t.Optional(
    t.Object({
      province: t.String({ description: "Province or state of the user's address" }),
      district: t.String({ description: "District or city of the user's address" }),
      subDistrict: t.String({ description: "Sub-district of the user's address" }),
    })
  ),
})

export type GetProfileByIdParams = Static<typeof GetProfileByIdParams>
export type GetProfileByIdResponse = Static<typeof GetProfileByIdResponse>

export const CompleteOnboardingProfileBody = t.Object({
  profile: t.Optional(
    t.Object({
      name: t.String({ description: 'The name of the user' }),
      profileImage: t.Optional(t.String({ description: 'The URL of the profile image' })),
    })
  ),
  interestTopics: t.Optional(
    t.Array(t.String({ description: 'List of interests or topics the user is interested in' }), {
      minItems: 3,
    })
  ),
  address: t.Optional(
    t.Object({
      province: t.String({ description: "Province or state of the user's address" }),
      district: t.String({ description: "District or city of the user's address" }),
      subDistrict: t.String({ description: "Sub-district of the user's address" }),
      postalCode: t.String({ description: "Postal code of the user's address" }),
    })
  ),
})
export const CompleteOnboardingProfileResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type CompleteOnboardingProfileBody = Static<typeof CompleteOnboardingProfileBody>
export type CompleteOnboardingProfileResponse = Static<typeof CompleteOnboardingProfileResponse>

export const FollowUserParams = t.Object({
  id: t.String({ description: 'The ID of the user to follow' }),
})
export const FollowUserResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type FollowUserParams = Static<typeof FollowUserParams>
export type FollowUserResponse = Static<typeof FollowUserResponse>

export const UnfollowUserParams = t.Object({
  id: t.String({ description: 'The ID of the user to unfollow' }),
})
export const UnfollowUserResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type UnfollowUserParams = Static<typeof UnfollowUserParams>
export type UnfollowUserResponse = Static<typeof UnfollowUserResponse>

export const UpdateProfileBody = t.Object({
  name: t.Optional(t.String({ description: 'The name of the user' })),
  profileImage: t.Optional(t.String({ description: 'The URL of the profile image' })),
  birthDate: t.Optional(t.String({ description: 'The birth date of the user' })),
  address: t.Optional(
    t.Object({
      province: t.String({ description: "Province or state of the user's address" }),
      district: t.String({ description: "District or city of the user's address" }),
      subDistrict: t.String({ description: "Sub-district of the user's address" }),
      postalCode: t.String({ description: "Postal code of the user's address" }),
    })
  ),
})
export const UpdateProfileResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type UpdateProfileBody = Static<typeof UpdateProfileBody>
export type UpdateProfileResponse = Static<typeof UpdateProfileResponse>
