import { Sequelize, importModels } from '@sequelize/core'
import { MariaDbDialect } from '@sequelize/mariadb'
import * as path from 'node:path'
import config from '../../config.json' with { type: 'json' }

const dirname = import.meta.dirname
const models = path
    .resolve(dirname, '../models/agent', '*.model.{ts,js}')
    .replace(/\\/g, '/')

export const agentDB = new Sequelize({
    dialect: MariaDbDialect,
    database: config.databases.agent.name,
    user: config.databases.agent.username,
    password: config.databases.agent.password,
    host: config.databases.agent.host,
    port: config.databases.agent.port,
    models: await importModels(models)
})
