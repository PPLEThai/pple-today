import path from 'node:path'

import * as dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

dotenv.config()

export default defineConfig({
  schema: './prisma',
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seeds/seed.dev.ts',
  },
})
