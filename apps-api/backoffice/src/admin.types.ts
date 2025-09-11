import { AdminController } from './modules/admin'

export * from './modules/address/models'
export * from './modules/admin/announcements/models'
export * from './modules/admin/banner/models'
export * from './modules/admin/file/models'
export * from './modules/admin/hashtag/models'
export * from './modules/admin/topic/models'

export type AdminApiSchema = typeof AdminController
