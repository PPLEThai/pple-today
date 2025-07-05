import node from '@elysiajs/node'
import Elysia from 'elysia'

import serverEnv from './config/env'

const app = new Elysia({ adapter: node() })
  .get('/', () => 'Hello, Elysia!')
  .listen(serverEnv.PORT, () => {
    console.log(`Server is running on http://localhost:${serverEnv.PORT}`)
  })
