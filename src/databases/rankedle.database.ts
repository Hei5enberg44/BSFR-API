import { Sequelize, importModels } from '@sequelize/core'
import { MariaDbDialect } from '@sequelize/mariadb'
import * as path from 'node:path'
import config from '../../config.json' with { type: 'json' }

const dirname = import.meta.dirname
const models = path
    .resolve(dirname, '../models/rankedle', '*.model.{ts,js}')
    .replace(/\\/g, '/')

export const rankedleDB = new Sequelize({
    dialect: MariaDbDialect,
    database: config.databases.rankedle.name,
    user: config.databases.rankedle.username,
    password: config.databases.rankedle.password,
    host: config.databases.rankedle.host,
    port: config.databases.rankedle.port,
    models: await importModels(models)
})
