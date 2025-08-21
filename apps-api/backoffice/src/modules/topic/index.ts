import Elysia from 'elysia'
import { TopicServicePlugin } from './service'

export const TopicControllerPlugin = new Elysia({
  prefix: '/topics',
  tags: ['Topic'],
})
  .use([TopicServicePlugin])
  .get('/', () => {})
  .get('/follows', () => {})
  .post('/:id/follow', () => {})
  .delete('/:id/follow', () => {})
