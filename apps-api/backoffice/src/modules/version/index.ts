import Elysia from 'elysia'

import packageJson from '../../../package.json'

export const VersionController = new Elysia().get('/version', ({ status }) => {
  const body = {
    name: packageJson.name,
    version: packageJson.version,
  }

  return status(200, body)
})
