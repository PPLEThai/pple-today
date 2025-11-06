import { DetailedUser, FilePath, User } from '@pple-today/api-common/dtos'
import { UserStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const UserIdParams = t.Object({
  userId: t.String({ description: 'The ID of the user' }),
})
export type UserIdParams = Static<typeof UserIdParams>

export const GetUsersQuery = t.Object({
  limit: t.Number(),
  page: t.Number(),
  search: t.Optional(t.String()),
  roles: t.Optional(t.Array(t.String({ description: 'The role of the user' }))),
})
export type GetUsersQuery = Static<typeof GetUsersQuery>

export const GetUsersResponse = t.Object({
  users: t.Array(User),
  meta: t.Object({ count: t.Number() }),
})
export type GetUsersResponse = Static<typeof GetUsersResponse>

export const GetUserByIdParams = UserIdParams
export type GetUserByIdParams = Static<typeof UserIdParams>

export const GetUserByIdResponse = DetailedUser
export type GetUserByIdResponse = Static<typeof GetUserByIdResponse>

export const UpdateUserParams = UserIdParams
export type UpdateUserParams = Static<typeof UpdateUserParams>

export const UpdateUserBody = t.Partial(
  t.Object({
    name: t.String({ description: 'The name of the author' }),
    profileImage: FilePath,
    status: t.Enum(UserStatus, { description: 'The status of the user' }),
  })
)
export type UpdateUserBody = Static<typeof UpdateUserBody>

export const UpdateUserResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateUserResponse = Static<typeof UpdateUserResponse>
