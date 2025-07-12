import node from '@elysiajs/node'
import { swagger } from '@elysiajs/swagger'
import Elysia from 'elysia'

import serverEnv from './config/env'
import prismaService from './libs/prisma'
import { postController } from './modules/post'

const app = new Elysia({ adapter: node() })
  .use(swagger())
  .use(postController)
  .use(prismaService)
  .get('/', () => 'Hello, Elysia!')
  .listen(serverEnv.PORT, () => {
    console.log(`Server is running on http://localhost:${serverEnv.PORT}`)
  })
