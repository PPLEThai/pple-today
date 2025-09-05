import { Static, TObject } from '@sinclair/typebox'
import { Parse } from '@sinclair/typebox/value'
import { configDotenv } from 'dotenv'
import Elysia from 'elysia'

interface ConfigServiceOptions<T extends TObject> {
  autoLoadEnv: boolean
  schema: T
}

export class ConfigService<T extends TObject, TValue extends Static<T> = Static<T>> {
  private config: TValue
  constructor(config: ConfigServiceOptions<T>) {
    if (config.autoLoadEnv) configDotenv()

    this.config = Parse(config.schema, process.env)
  }

  get<TKey extends keyof TValue>(key: TKey): TValue[TKey] {
    return this.config[key]
  }
}

export const createConfigServicePlugin = <T extends TObject>(config: ConfigServiceOptions<T>) =>
  new Elysia({ name: 'ConfigService' })
    .decorate({
      configService: new ConfigService(config),
    })
    .as('global')
