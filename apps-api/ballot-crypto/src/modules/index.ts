import Elysia from 'elysia'

import { BallotController } from './ballot'
import { KeyController } from './key'

export const ApplicationController = new Elysia().use(KeyController).use(BallotController)
