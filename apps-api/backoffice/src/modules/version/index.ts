import Elysia from 'elysia'

import packageJson from '../../../package.json'

export const VersionController = new Elysia({ tags: ['Version'] }).get('/version', ({ status }) => {
  const body = {
    name: packageJson.name,
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  }

  return status(200, body)
})
