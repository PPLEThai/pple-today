import { t } from 'elysia'

export const FollowUserParams = t.Object({
  id: t.String({ description: 'The ID of the user to follow' }),
})
export const FollowUserResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export const UnfollowUserParams = t.Object({
  id: t.String({ description: 'The ID of the user to unfollow' }),
})
export const UnfollowUserResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
