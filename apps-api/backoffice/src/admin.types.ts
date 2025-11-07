import { AdminController } from './modules/admin'

export type * from './modules/address/models'
export type * from './modules/admin/announcements/models'
export type * from './modules/admin/auth/models'
export type * from './modules/admin/banner/models'
export type * from './modules/admin/dashboard/models'
export type * from './modules/admin/election/models'
export type * from './modules/admin/facebook/models'
export type * from './modules/admin/file/models'
export type * from './modules/admin/hashtag/models'
export type * from './modules/admin/poll/models'
export type * from './modules/admin/post/models'
export type * from './modules/admin/topic/models'
export type * from './modules/admin/user/models'
export type * from '@pple-today/api-common/dtos'

export type AdminApiSchema = typeof AdminController
