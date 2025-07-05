import { Value } from '@sinclair/typebox/value'
import { configDotenv } from 'dotenv'
import { t } from 'elysia'

configDotenv()

const envConfigSchema = t.Object({
  PORT: t.Number({ default: 5000 }),
  DATABASE_URL: t.String(),
})

const serverEnv = Value.Parse(envConfigSchema, process.env)

export default serverEnv
