import { ApplicationController } from './modules'

export type * from './modules/address/models'
export type * from './modules/announcements/models'
export type * from './modules/auth/models'
export type * from './modules/banner/models'
export type * from './modules/election/models'
export type * from './modules/facebook/models'
export type * from './modules/feed/models'
export type * from './modules/hashtag/models'
export type * from './modules/health/models'
export type * from './modules/notification/models'
export type * from './modules/polls/models'
export type * from './modules/profile/models'
export type * from './modules/search/models'
export type * from './modules/topic/models'
export type * from '@pple-today/api-common/dtos'

export type ApplicationApiSchema = typeof ApplicationController
