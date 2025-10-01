import Elysia from 'elysia'

import { KeyServicePlugin } from './services'

export const KeyController = new Elysia({
  prefix: '/keys',
  tags: ['Keys'],
}).use(KeyServicePlugin)
