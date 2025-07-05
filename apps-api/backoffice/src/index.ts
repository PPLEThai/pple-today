import node from '@elysiajs/node'
import { configDotenv } from 'dotenv'
import Elysia from 'elysia'

import serverEnv from './config/env'

configDotenv()

const app = new Elysia({ adapter: node() })
  .get('/', () => 'Hello, Elysia!')
  .listen(serverEnv.PORT, () => {
    console.log(`Server is running on http://localhost:${serverEnv.PORT}`)
  })
