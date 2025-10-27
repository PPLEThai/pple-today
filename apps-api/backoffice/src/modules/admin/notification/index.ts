import Elysia from 'elysia'

const AdminNotificationController = new Elysia({ prefix: '/notifications' })
  .get('/api-keys', () => {})
  .post('/api-key', () => {})
  .post('/api-key/:id/rotate', () => {})
  .patch('/api-key/:id', () => {})
  .delete('/api-key/:id', () => {})
