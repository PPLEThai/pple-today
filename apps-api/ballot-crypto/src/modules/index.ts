import Elysia from 'elysia'

import { KeyController } from './key'

export const ApplicationController = new Elysia().use(KeyController)
